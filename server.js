/*
 * Thesis backend — thin gateway in front of the Anthropic Claude API.
 *
 * Serves the static frontend AND the chat API from the same origin, so the
 * browser uses relative /api/... paths and the API key never reaches the client.
 *
 * Storage is session-only and in-memory (a Map). No database; state is lost on
 * restart. The full conversation history is kept per session and re-sent to
 * Claude on every call, alongside the phase-appropriate system prompt.
 *
 * Phases (Status Brief §3.2):
 *   Phase B — shared career-recommendation dialogue (Appendix B)
 *   Phase C — role-play. MAIN = full design (Appendix C); BASELINE = career only (Appendix D)
 */

import './lib/env.js'; // MUST be first: loads .env before any module reads process.env
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { buildPhaseBPrompt, buildSystemPrompt, buildBaselinePrompt } from './lib/prompt.js';
import { dbEnabled, initSchema } from './lib/db.js';
import { mountStudyRoutes } from './lib/study_routes.js';
import { mountAdminRoutes } from './lib/admin_routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const PHASE_B_NUDGE =
  '(Begin the recommendation conversation now — greet me warmly and ask your first question.)';
const PHASE_C_NUDGE =
  '(Begin the conversation now — send your first message to me as my future self.)';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** sessionId -> { phase: 'b'|'c', systemPrompt, messages: [{ role, content }] } */
const sessions = new Map();

/** Call Claude with a system prompt + message history, return assistant text. */
async function complete(systemPrompt, messages) {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

/** Create a session, seed it with a nudge, fetch the opener, return {sessionId, opening}. */
async function openSession(phase, systemPrompt, nudge) {
  const messages = [{ role: 'user', content: nudge }];
  const opening = await complete(systemPrompt, messages);
  messages.push({ role: 'assistant', content: opening });
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { phase, systemPrompt, messages });
  return { sessionId, opening };
}

const PHASE_B_REC_FALLBACK =
  'Based on what you\'ve shared, here are five directions worth exploring — tap whichever you\'re most curious to step into.';

/**
 * Pull the Phase-B career recommendations out of a guide reply.
 * The guide is prompted to emit a ```json {"recommendations":[{title,why,path}]}```
 * block; we parse it into cards and strip it from the visible text. Returns the
 * cleaned prose plus the structured list (null if absent / malformed).
 */
function extractRecommendations(reply) {
  const m = reply.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (!m) return { clean: reply, recommendations: null };
  let recs = null;
  try {
    const parsed = JSON.parse(m[1].trim());
    if (Array.isArray(parsed?.recommendations)) {
      recs = parsed.recommendations
        .filter((r) => r && r.title)
        .slice(0, 5)
        .map((r) => ({
          title: String(r.title).slice(0, 120),
          why: String(r.why || '').slice(0, 400),
          path: String(r.path || '').slice(0, 400),
        }));
    }
  } catch { /* malformed block -> leave recs null, fall back to raw reply */ }
  if (!recs || !recs.length) return { clean: reply, recommendations: null };
  const clean = reply.replace(m[0], '').trim() || PHASE_B_REC_FALLBACK;
  return { clean, recommendations: recs };
}

const app = express();
app.use(express.json({ limit: '512kb' }));

// CORS — the frontend is hosted on a different origin (Vercel) from this API
// (Railway). No cookies/auth, so a permissive policy is fine for this gateway.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Phase B: shared recommendation guide ---------------------------------

app.post('/api/phase-b/session', async (req, res) => {
  try {
    const { profileData = {} } = req.body || {};
    const out = await openSession('b', buildPhaseBPrompt(profileData), PHASE_B_NUDGE);
    res.json(out);
  } catch (err) {
    console.error('POST /api/phase-b/session failed:', err?.message || err);
    res.status(502).json({ error: 'Could not reach the guide. Please try again.' });
  }
});

// --- Phase C: role-play, condition-routed ---------------------------------

app.post('/api/phase-c/session', async (req, res) => {
  try {
    const { condition = 'main', profileData = {}, phaseBNotes = '' } = req.body || {};
    // Condition routing (Status Brief §3.3): MAIN gets the full profile + phase-b
    // carry-over; BASELINE gets ONLY the chosen career name.
    const systemPrompt = condition === 'baseline'
      ? buildBaselinePrompt(profileData.career)
      : buildSystemPrompt(profileData, phaseBNotes);
    const out = await openSession('c', systemPrompt, PHASE_C_NUDGE);
    res.json(out);
  } catch (err) {
    console.error('POST /api/phase-c/session failed:', err?.message || err);
    res.status(502).json({ error: 'Could not reach your future self. Please try again.' });
  }
});

// --- Generic chat + regenerate (work for any session) ---------------------

app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body || {};
  const session = sessions.get(sessionId);
  if (!session) return res.status(400).json({ error: 'Unknown session.' });
  const text = (message || '').toString().trim();
  if (!text) return res.status(400).json({ error: 'Empty message.' });

  session.messages.push({ role: 'user', content: text });
  try {
    const reply = await complete(session.systemPrompt, session.messages);
    session.messages.push({ role: 'assistant', content: reply });
    // Phase B proposes five career directions as a structured block -> cards.
    if (session.phase === 'b') {
      const { clean, recommendations } = extractRecommendations(reply);
      return res.json({ reply: clean, recommendations });
    }
    res.json({ reply });
  } catch (err) {
    console.error('POST /api/chat failed:', err?.message || err);
    session.messages.pop(); // roll back the user turn so a retry is clean
    res.status(502).json({ error: 'Your future self went quiet. Please try again.' });
  }
});

app.post('/api/regenerate', async (req, res) => {
  const { sessionId } = req.body || {};
  const session = sessions.get(sessionId);
  if (!session) return res.status(400).json({ error: 'Unknown session.' });

  const last = session.messages[session.messages.length - 1];
  if (!last || last.role !== 'assistant') {
    return res.status(400).json({ error: 'Nothing to regenerate.' });
  }
  const popped = session.messages.pop();
  try {
    const reply = await complete(session.systemPrompt, session.messages);
    session.messages.push({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (err) {
    console.error('POST /api/regenerate failed:', err?.message || err);
    session.messages.push(popped); // restore the previous reply on failure
    res.status(502).json({ error: 'Could not rephrase. Please try again.' });
  }
});

// --- Study platform: persistence + admin (additive) -----------------------
// Mounted before the static handler so /admin and /api/* take precedence.
mountStudyRoutes(app);
mountAdminRoutes(app);

// --- Static frontend ------------------------------------------------------
// Block server source, libs, DB schema, eval internals, tests, and the admin
// HTML (served only via the gated /admin route) from being served statically.
const STATIC_DENY = /^\/(lib|db|test|node_modules|eval_pipeline)(\/|$)/;
app.use((req, res, next) => {
  if (STATIC_DENY.test(req.path)) return res.status(404).end();
  if (req.path === '/admin/index.html' || req.path === '/admin/login.html') return res.status(404).end();
  next();
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;

async function boot() {
  if (dbEnabled) {
    try {
      await initSchema();
      console.log('DB schema ready (persistence ON).');
    } catch (err) {
      console.error('⚠  DB schema init failed — running WITHOUT persistence:', err?.message || err);
    }
  } else {
    console.warn('⚠  DATABASE_URL not set — sessions are in-memory only (no persistence).');
  }
  app.listen(PORT, () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠  ANTHROPIC_API_KEY is not set — API calls will fail. Add it to .env');
    }
    if (!process.env.ADMIN_TOKEN) {
      console.warn('⚠  ADMIN_TOKEN is not set — the /admin dashboard is disabled.');
    }
    console.log(`Thesis running at http://localhost:${PORT}`);
  });
}

boot();
