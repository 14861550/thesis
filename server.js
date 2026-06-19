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
// model's instinct to paint full scenes (live-tested on gpt-5.1). The earlier,
// softer wording wasn't enough: with the "ideas to ask" cards (every tap sends a
// real, substantive question) gpt-5.1 answered each one fully — measured ~135
// words/reply, 5 of 8 over 110, with little variation. This stricter, numeric
// version pulls it to ~60–70 words with real high/low variation while keeping the
// vivid scenes (tested across careers, 2026-06-19). Identical across main/baseline
// (kept symmetric to avoid a length confound); Phase B (incl. Andrea's) untouched.
const BREVITY_REMINDER =
  'LENGTH — STRICT (overrides the length guidance above). Default reply = 1–2 sentences (~30 words). Even for a real, open question, STOP by ~90 words — most answers should be ~40–60. Vary hard: each reply a CLEARLY different length from your last one or two; never two medium paragraphs in a row; if you can answer in one vivid line, do. Brevity beats completeness. End with at most ONE question, only when it follows naturally and is bridged in — never dropped in cold.';

// Phase-C MAIN only (NOT baseline — the minimal control deliberately has no
// mirroring instruction, and voice-matching is part of the main condition's
// closeness mechanism, so keeping it main-only also sharpens the intended
// contrast). Re-asserted every turn for the same reason as BREVITY: the long
// COMPONENT 1 mirroring rule, buried high in the system prompt, loses to
// gpt-5.1's instinct to write clean, capitalised prose as the chat grows —
// live-tested, the future self stopped matching an all-lowercase user. This
// trailing, most-recent reminder restores it BOTH ways (lowercase→lowercase,
// formal→formal), verified on gpt-5.1 2026-06-19.
const STYLE_REMINDER =
  "VOICE — MATCH HOW THEY TYPE, FRESH EACH TURN. Read the user's LAST message and mirror its register. If that message uses normal capital letters and full punctuation, you write the same way — clean, properly capitalised sentences. If instead it is all-lowercase with loose punctuation (e.g. \"heyy hows the money honestly\"), then you reply all-lowercase and loose too, and do NOT tidy it into Capitalised, fully-punctuated sentences. Same with slang: use \"u\", \"idk\", \"lol\", \"ngl\" back only when they do. You are them, ten years on — you would text in their register, whatever it is. Don't lock into one style; re-read each message and follow THEIR lead.";

/** Trailing system reminders, in order, for a given turn (most-recent wins). */
function trailers({ remind = false, style = false } = {}) {
  return [remind && BREVITY_REMINDER, style && STYLE_REMINDER].filter(Boolean);
}

/** Call the configured model with a system prompt + history; return assistant text. */
async function complete(systemPrompt, messages, opts = {}) {
  if (USE_PROXY) return completeOpenAI(systemPrompt, messages, opts);
  const extra = trailers(opts);
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: extra.length ? `${systemPrompt}\n\n${extra.join('\n\n')}` : systemPrompt,
    messages,
  });
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

/** OpenAI-compatible chat-completions (UvA proxy). Retries 429/5xx with backoff;
 *  auth failures surface immediately (not retried). */
async function completeOpenAI(systemPrompt, messages, opts = {}) {
  const body = {
    model: MODEL,
    // The trailing system reminder(s) ride at the END of the turn list so they
    // are the most recent instructions the model sees (recency beats a rule
    // buried in a long system prompt). Call-time only — never stored in the
    // session.
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
      ...trailers(opts).map((content) => ({ role: 'system', content })),
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

/** Create a session, seed it with a nudge, fetch the opener, return {sessionId, opening}.
 *  `style` (phase-C main only) adds the per-turn voice-mirroring reminder and is
 *  persisted on the session so every later turn re-asserts it. */
async function openSession(phase, systemPrompt, nudge, { style = false } = {}) {
  const messages = [{ role: 'user', content: nudge }];
  const opening = await complete(systemPrompt, messages, { remind: phase === 'c', style });
  messages.push({ role: 'assistant', content: opening });
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { phase, systemPrompt, messages, style });
  return { sessionId, opening };
}

const app = express();
app.use(express.json({ limit: '512kb' }));

// CORS — the participant frontend may be hosted on a different origin (Vercel)
// from this API (Railway), so the public chat/study endpoints allow any origin.
// The gated /api/admin and /api/results data APIs are SAME-ORIGIN (served from
// here) and authenticate with an httpOnly cookie, so they are deliberately
// excluded from the wildcard: without Access-Control-Allow-Credentials the
// cookie can't ride a cross-origin fetch anyway, and never opening these to
// other origins keeps it that way (no CSRF/exfil foothold).
app.use((req, res, next) => {
  const gatedApi = req.path.startsWith('/api/admin') || req.path.startsWith('/api/results');
  if (!gatedApi) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
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
    // The direct arm jumps STRAIGHT to the five cards in its opening turn, so the
    // recommendation block must be extracted here too — otherwise the raw JSON
    // leaks into the first bubble (only /api/chat extracted it before). The
    // reflective arm opens with a question, so this is a no-op there.
    const { clean, recommendations } = extractRecommendations(out.opening);
    res.json({ sessionId: out.sessionId, opening: clean, recommendations });
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
    const isBaseline = condition === 'baseline';
    const systemPrompt = isBaseline
      ? buildBaselinePrompt(profileData.career, location)
      : buildSystemPrompt(profileData, phaseBNotes, location);
    // Voice-mirroring reminder is MAIN-only (baseline minimal control unchanged).
    const style = !isBaseline;
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
        sessions.set(sessionId, { phase: 'c', systemPrompt, messages, style });
        return res.json({ sessionId, resumed: true, opening: null });
      }
      messages.push({ role: 'user', content: PHASE_C_RESUME_NUDGE });
      const opening = await complete(systemPrompt, messages, { remind: true, style });
      messages.push({ role: 'assistant', content: opening });
      sessions.set(sessionId, { phase: 'c', systemPrompt, messages, style });
      return res.json({ sessionId, opening, resumed: true });
    }
    const out = await openSession('c', systemPrompt, PHASE_C_NUDGE, { style });
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
    const reply = await complete(session.systemPrompt, session.messages, { remind: session.phase === 'c', style: !!session.style });
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
    const reply = await complete(session.systemPrompt, session.messages, { remind: session.phase === 'c', style: !!session.style });
    session.messages.push({ role: 'assistant', content: reply });
    // Symmetry with /api/chat: a regenerated phase-B turn can carry the card
    // block, so extract it rather than leak raw JSON. (Phase B doesn't expose
    // regenerate today; this guards against that wiring landing later.)
    if (session.phase === 'b') {
      const { clean, recommendations } = extractRecommendations(reply);
      return res.json({ reply: clean, recommendations });
    }
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

// --- Public landing / "about" page ----------------------------------------
// site/index.html is a polished landing page (app link + project info). It was
// built for GitHub Pages, but this repo's Pages can't be enabled without the
// owner: the collaborator's Settings has no Pages option, and the Actions token
// gets "Resource not accessible by integration" trying to create the site. So
// we also serve it straight from the app for a guaranteed public URL — /about
// (alias /welcome). The participant app stays at /.
app.get(['/about', '/welcome'], (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// --- Static frontend ------------------------------------------------------
// Serve ONLY the participant app's public assets, via an ALLOWLIST. A denylist
// was used before and kept under-specifying — the app/admin/results `.jsx`
// sources, `server.js`, `build.mjs`, `package.json`, and the study-design
// `docs/*.docx` were all world-readable, and the gated dashboards' raw source
// (`/admin/admin.jsx`, `/results/results.jsx`) defeated their own auth gate.
// The gated `/admin` + `/results` pages and their compiled bundles are served
// by their own routes above; everything else (backend source, build scripts,
// study docs, raw .jsx) must 404. Captured from the live app, the participant
// frontend needs exactly: `/`, index.html, config.js, styles.css, build/*.js,
// vendor/*.js.
const STATIC_ALLOW = /^\/(|index\.html|config\.js|styles\.css|build\/[A-Za-z0-9._-]+\.js|vendor\/[A-Za-z0-9._-]+\.js)$/;
app.use((req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && !STATIC_ALLOW.test(req.path)) {
    return res.status(404).end();
  }
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
