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
import { pickPhaseBPrompt, buildSystemPrompt, buildBaselinePrompt } from './lib/prompt.js';
import { extractRecommendations } from './lib/recs.js';
import { dbEnabled, initSchema, probe } from './lib/db.js';
import { mountStudyRoutes } from './lib/study_routes.js';
import { mountAdminRoutes } from './lib/admin_routes.js';
import { mountResultsRoutes } from './lib/results_routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Model provider (Build Plan §12: "the model is a single config value") ---
// Two interchangeable backends, chosen by env. The participant chat is the ONLY
// thing this governs; the eval pipeline / silicon cohort keep their own client.
//   • UvA AI Chat proxy (gpt-5.1, OpenAI-compatible) — set LLM_BASE_URL + UVA_API_TOKEN
//   • Anthropic Claude (the original path)           — set ANTHROPIC_API_KEY
const LLM_BASE_URL = (process.env.LLM_BASE_URL || '').replace(/\/+$/, '');
const UVA_API_TOKEN = process.env.UVA_API_TOKEN || '';
const USE_PROXY = Boolean(LLM_BASE_URL && UVA_API_TOKEN);
const MODEL = process.env.MODEL_ID || (USE_PROXY ? 'gpt-5.1' : 'claude-sonnet-4-6');
const TEMPERATURE = Number(process.env.LLM_TEMPERATURE ?? 0.9);
// Reply token cap — a SAFETY CEILING, not a quality knob: it does nothing
// unless hit. It must be generous because on reasoning models (gpt-5.1 via the
// UvA proxy) hidden reasoning tokens count against it too — a tight cap both
// truncates the visible reply mid-sentence AND starves the model of thinking
// room. 16384 ≈ unlimited for this app's short replies; visible length is
// governed by the prompts, and the 90s LLM_TIMEOUT_MS bounds runaway calls.
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS ?? 16384);
const REQUEST_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 90000);
const PHASE_B_NUDGE =
  '(Begin the recommendation conversation now — greet me warmly and ask your first question.)';
const PHASE_C_NUDGE =
  '(Begin the conversation now — send your first message to me as my future self.)';
const PHASE_C_RESUME_NUDGE =
  '(I had to step away earlier and am back now — pick our conversation back up naturally, briefly, without making a big deal of the gap.)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const anthropic = USE_PROXY ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** sessionId -> { phase: 'b'|'c', systemPrompt, messages: [{ role, content }] } */
const sessions = new Map();

// Phase-C only: re-asserted on EVERY call because as a conversation grows, a
// length rule stated once at the top of a long system prompt loses out to the
// model's instinct to paint full scenes (live-tested on gpt-5.1: a casual
// question still drew 300+ words). Now it also pushes for VARIATION — the
// supervisor (14 Jun 2026) found replies almost always the same length. Identical
// across main/baseline; Phase B (incl. Andrea's prompts) is never touched.
const BREVITY_REMINDER =
  'Keep this reply comfortable to read, and vary it from your last few. Let the weight of what they just said set the length: a light question gets a short answer (sometimes a line or two), a real one can run to 2-3 short paragraphs — never a wall of text, and never the same length every time. At most one question, only if it follows naturally from the conversation and is bridged into with a connecting sentence — never dropped in cold.';

/** Call the configured model with a system prompt + history; return assistant text. */
async function complete(systemPrompt, messages, { remind = false } = {}) {
  if (USE_PROXY) return completeOpenAI(systemPrompt, messages, { remind });
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: remind ? `${systemPrompt}\n\n${BREVITY_REMINDER}` : systemPrompt,
    messages,
  });
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

/** OpenAI-compatible chat-completions (UvA proxy). Retries 429/5xx with backoff;
 *  auth failures surface immediately (not retried). */
async function completeOpenAI(systemPrompt, messages, { remind = false } = {}) {
  const body = {
    model: MODEL,
    // The trailing system reminder rides at the END of the turn list so it is
    // the most recent instruction the model sees (recency beats a rule buried
    // in a long system prompt). Call-time only — never stored in the session.
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
      ...(remind ? [{ role: 'system', content: BREVITY_REMINDER }] : []),
    ],
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  };
  let lastErr = 'unknown';
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const r = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${UVA_API_TOKEN}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (r.status === 401 || r.status === 403) throw new Error('model auth rejected — check UVA_API_TOKEN');
      if (r.status === 429 || r.status >= 500) { lastErr = `upstream ${r.status}`; await sleep(1500 * (attempt + 1)); continue; }
      if (!r.ok) throw new Error(`upstream ${r.status}`);
      const data = await r.json();
      const choice = data?.choices?.[0];
      if (choice?.finish_reason === 'length') {
        console.warn(`[llm] reply hit the ${MAX_TOKENS}-token cap (finish_reason=length) — visible text may be cut off; raise LLM_MAX_TOKENS.`);
      }
      return (choice?.message?.content || '').trim();
    } catch (e) {
      if (e.message && e.message.includes('auth rejected')) throw e;
      lastErr = e.name === 'AbortError' ? 'timeout' : (e.message || 'network');
      await sleep(1500 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`model unavailable after retries (${lastErr})`);
}

/** Create a session, seed it with a nudge, fetch the opener, return {sessionId, opening}. */
async function openSession(phase, systemPrompt, nudge) {
  const messages = [{ role: 'user', content: nudge }];
  const opening = await complete(systemPrompt, messages, { remind: phase === 'c' });
  messages.push({ role: 'assistant', content: opening });
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { phase, systemPrompt, messages });
  return { sessionId, opening };
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

// --- Health (deploy verification + uptime checks; Build Plan §13b) ---------
// `db` is a REAL connection probe (SELECT 1), not just "is DATABASE_URL set",
// so a misconfigured database shows up here instead of silently losing data.
app.get(['/healthz', '/api/health'], async (req, res) => {
  const db = await probe();
  res.json({
    ok: true,
    model: MODEL,
    provider: USE_PROXY ? 'uva-proxy' : 'anthropic',
    db: db.ok,
    db_detail: db,
  });
});

// --- Phase B: shared recommendation guide ---------------------------------

app.post('/api/phase-b/session', async (req, res) => {
  try {
    // `rec` (direct | reflective | guide) selects the Phase-B prompt (Build Plan
    // §6). Default = direct (v5.3 §6; reflective = Andrea; guide = legacy backup).
    const { profileData = {}, rec = 'direct', priorTranscript = [] } = req.body || {};
    // Resume after a refresh/restart mid-recommendation-chat: replay the saved
    // transcript into a fresh model session (silently — the guide's last message
    // is already on screen) so the conversation continues instead of restarting.
    if (Array.isArray(priorTranscript) && priorTranscript.length) {
      const messages = priorTranscript
        .filter((m) => m && typeof m.text === 'string' && m.text.trim())
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { phase: 'b', systemPrompt: pickPhaseBPrompt(rec, profileData), messages });
      return res.json({ sessionId, opening: null, resumed: true });
    }
    const out = await openSession('b', pickPhaseBPrompt(rec, profileData), PHASE_B_NUDGE);
    res.json(out);
  } catch (err) {
    console.error('POST /api/phase-b/session failed:', err?.message || err);
    res.status(502).json({ error: 'Could not reach the guide. Please try again.' });
  }
});

// --- Phase C: role-play, condition-routed ---------------------------------

app.post('/api/phase-c/session', async (req, res) => {
  try {
    const {
      condition = 'main', profileData = {}, phaseBNotes = '', location = '',
      priorTranscript = [], silentResume = false,
    } = req.body || {};
    // Condition routing (Status Brief §3.3 / Build Plan §6): MAIN gets the full
    // profile + phase-b carry-over + location; BASELINE gets ONLY the chosen
    // career name + location (the chosen scenario is shared; the profile is not).
    const systemPrompt = condition === 'baseline'
      ? buildBaselinePrompt(profileData.career, location)
      : buildSystemPrompt(profileData, phaseBNotes, location);
    // RESUME of an interrupted role-play: the saved transcript is replayed into
    // the model's history so the future self remembers the earlier conversation.
    //  - silentResume: reconnection after a lost server session (e.g. a server
    //    restart mid-chat) — seed the history and return immediately, no greeting;
    //    the participant's next message continues the conversation seamlessly.
    //  - otherwise (admin resume link): re-open with a brief natural welcome-back.
    if (Array.isArray(priorTranscript) && priorTranscript.length) {
      const messages = priorTranscript
        .filter((m) => m && typeof m.text === 'string' && m.text.trim())
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const sessionId = crypto.randomUUID();
      if (silentResume) {
        sessions.set(sessionId, { phase: 'c', systemPrompt, messages });
        return res.json({ sessionId, resumed: true, opening: null });
      }
      messages.push({ role: 'user', content: PHASE_C_RESUME_NUDGE });
      const opening = await complete(systemPrompt, messages, { remind: true });
      messages.push({ role: 'assistant', content: opening });
      sessions.set(sessionId, { phase: 'c', systemPrompt, messages });
      return res.json({ sessionId, opening, resumed: true });
    }
    const out = await openSession('c', systemPrompt, PHASE_C_NUDGE);
    res.json(out);
  } catch (err) {
    console.error('POST /api/phase-c/session failed:', err?.message || err);
    res.status(502).json({ error: 'Could not reach your future self. Please try again.' });
  }
});

// --- Career sanity check (stage-B lock-in gate) ----------------------------
// Free-typed careers are judged by the model before the role-play can start —
// "haha" must not become a future self. FAIL-OPEN: if the check itself errors,
// the participant is never blocked.
const CAREER_CHECK_PROMPT = `You check whether a participant's short free-text answer names a plausible career, job, occupation, or professional direction (e.g. "data analyst", "high school teacher", "startup founder", "marine biologist"). Be permissive: misspellings, broad fields ("finance", "something with sustainability"), and niche or emerging roles all count. Gibberish, jokes, greetings, single random words that are not occupations, refusals, or clearly non-career answers do not.
Reply with ONLY a JSON object, nothing else:
{"ok": true} — if it plausibly names a career or professional direction
{"ok": false, "hint": "<one short, friendly sentence (max 20 words) asking them to name a career>"} — if not`;

app.post('/api/validate-career', async (req, res) => {
  const career = ((req.body || {}).career || '').toString().trim().slice(0, 120);
  if (!career) return res.json({ ok: false, hint: 'Type the career you want to step into.' });
  try {
    const out = await complete(CAREER_CHECK_PROMPT, [{ role: 'user', content: career }]);
    const m = out.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : { ok: true };
    res.json({ ok: parsed.ok !== false, hint: typeof parsed.hint === 'string' ? parsed.hint.slice(0, 200) : undefined });
  } catch (err) {
    console.warn('validate-career failed open:', err?.message || err);
    res.json({ ok: true, failOpen: true });
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
    const reply = await complete(session.systemPrompt, session.messages, { remind: session.phase === 'c' });
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
    const reply = await complete(session.systemPrompt, session.messages, { remind: session.phase === 'c' });
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
mountResultsRoutes(app);

// --- Static frontend ------------------------------------------------------
// Block server source, libs, DB schema, eval internals, tests, and the admin
// HTML (served only via the gated /admin route) from being served statically.
const STATIC_DENY = /^\/(lib|db|test|node_modules|eval_pipeline|showcase)(\/|$)/;
app.use((req, res, next) => {
  if (STATIC_DENY.test(req.path)) return res.status(404).end();
  if (req.path === '/admin/index.html' || req.path === '/admin/login.html') return res.status(404).end();
  if (req.path === '/results/index.html' || req.path === '/results/login.html') return res.status(404).end();
  // The precompiled dashboard bundles are served only via their gated routes
  // (mounted above); never let express.static hand them out unauthenticated.
  if (req.path === '/admin/admin.js' || req.path === '/results/results.js') return res.status(404).end();
  next();
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;

async function boot() {
  if (dbEnabled) {
    try {
      const r = await initSchema();
      console.log(r.ok
        ? `DB schema ready (persistence ON; ${r.ran} statements).`
        : `⚠  DB schema applied with ${r.failures.length} failed statement(s) — see warnings above.`);
    } catch (err) {
      console.error('⚠  DB unreachable — sessions will NOT persist. Check DATABASE_URL / DATABASE_SSL:', err?.message || err);
    }
  } else {
    console.warn('⚠  DATABASE_URL not set — sessions are in-memory only (no persistence).');
  }
  app.listen(PORT, () => {
    if (USE_PROXY) {
      console.log(`Model: ${MODEL} via UvA proxy (${LLM_BASE_URL}).`);
    } else if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠  No model configured — set LLM_BASE_URL+UVA_API_TOKEN (gpt-5.1) or ANTHROPIC_API_KEY. Chat will fail.');
    } else {
      console.log(`Model: ${MODEL} via Anthropic.`);
    }
    if (!process.env.ADMIN_TOKEN) {
      console.warn('⚠  ADMIN_TOKEN is not set — the /admin dashboard is disabled.');
    }
    console.log(`Thesis running at http://localhost:${PORT}`);
  });
}

boot();
