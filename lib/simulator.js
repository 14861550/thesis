/*
 * lib/simulator.js — "silicon participant" bot↔bot runs for the /results page.
 *
 * A persona built from a (real) session's profile plays the USER and chats with
 * the SAME future-self bot the humans used (buildSystemPrompt / buildBaselinePrompt),
 * via claude-sonnet-4-6. The simulated Phase-C transcript is stored so /results
 * can show it beside the matched real transcript.
 *
 * The conversation engine takes an injectable `llm(system, messages) -> text`,
 * so it is unit-tested fully offline with a deterministic stub (test/simulator.test.mjs).
 * Node owns DB I/O; the engine itself touches no database.
 */

import Anthropic from '@anthropic-ai/sdk';

import { query } from './db.js';
import { getSessionRow, reconstructStudy } from './sessions.js';
import {
  buildSystemPrompt, buildBaselinePrompt, buildSimulatorPersonaPrompt,
} from './prompt.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
// Same opener nudge the live app seeds Phase C with, so the bot opens identically.
const PHASE_C_NUDGE =
  '(Begin the conversation now — send your first message to me as my future self.)';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function realLlm(system, messages) {
  const res = await anthropic.messages.create({
    model: MODEL, max_tokens: MAX_TOKENS, system, messages,
  });
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

/**
 * Reconstruct the bot's `profileData` shape from a stored study object
 * (mirrors the frontend's buildProfileData: pre-survey + scores + phase B).
 */
export function profileDataFromStudy(study = {}) {
  const pre = study.preSurvey || {};
  const scores = study.scores || {};
  const b = study.phaseB || {};
  return {
    year: pre.year,
    demographics: { age: pre.age, gender: pre.gender, major: 'Economics & Business' },
    bigFive: scores.bigFive || {},
    values: Array.isArray(scores.values) ? scores.values : [],
    riasec: scores.riasec || {},
    career: b.career,
    familiarity: b.familiarity,
    interestStrength: b.interestStrength,
  };
}

/**
 * Run one simulated Phase-C conversation. Returns a transcript in the app's
 * stored shape: [{ role: 'assistant'|'user', text }] where `assistant` is the
 * future-self bot and `user` is the simulated participant.
 *
 * Two private histories keep role sequences valid for the Anthropic API (each
 * starts with a 'user' message and alternates); `transcript` is the canonical
 * record. `turns` = number of simulated-participant messages.
 */
export async function runSimulatedConversation({
  profileData = {}, condition = 'main', turns = 5, llm = realLlm,
} = {}) {
  const systemBot = condition === 'baseline'
    ? buildBaselinePrompt(profileData.career)
    : buildSystemPrompt(profileData, ''); // no Phase-B carry-over: self-contained sim
  const systemSim = buildSimulatorPersonaPrompt(profileData);

  const transcript = [];

  // Future-self bot opens (identical seed to the live app).
  const botHistory = [{ role: 'user', content: PHASE_C_NUDGE }];
  const opening = await llm(systemBot, botHistory);
  botHistory.push({ role: 'assistant', content: opening });
  transcript.push({ role: 'assistant', text: opening });

  const simHistory = []; // simulated participant's POV (bot lines = 'user')

  for (let i = 0; i < turns; i++) {
    // Latest bot line is always the last transcript entry at the top of the loop.
    const lastBotLine = transcript[transcript.length - 1].text;
    simHistory.push({ role: 'user', content: lastBotLine });
    const simReply = await llm(systemSim, simHistory);
    simHistory.push({ role: 'assistant', content: simReply });
    transcript.push({ role: 'user', text: simReply });

    if (i === turns - 1) break; // last participant turn; no trailing bot reply

    botHistory.push({ role: 'user', content: simReply });
    const botReply = await llm(systemBot, botHistory);
    botHistory.push({ role: 'assistant', content: botReply });
    transcript.push({ role: 'assistant', text: botReply });
  }

  return transcript;
}

// --- DB wrappers + async runner ---------------------------------------------

function sanitizeTurns(t) {
  return Math.min(Math.max(parseInt(t, 10) || 5, 1), 12);
}

export async function createSimulation({ source_session_id, turns } = {}) {
  if (!source_session_id) throw new Error('source_session_id is required.');
  const row = await getSessionRow(source_session_id);
  if (!row) throw new Error('Source session not found.');
  const study = reconstructStudy(row);
  const profileData = profileDataFromStudy(study);
  if (!profileData.career) {
    throw new Error('Source session has no chosen career (Phase B incomplete).');
  }
  const t = sanitizeTurns(turns);
  const config = { model: MODEL, turns: t, condition: row.condition };

  const { rows } = await query(
    `INSERT INTO simulations (status, source_type, source_session_id, persona, config)
     VALUES ('queued', 'real', $1, $2, $3) RETURNING *`,
    [source_session_id, JSON.stringify(profileData), JSON.stringify(config)]
  );
  const sim = rows[0];

  // Fire-and-forget; status is tracked in the DB and polled by the dashboard.
  execute(sim.id, profileData, config).catch(async (err) => {
    console.error('[sim] run', sim.id, 'crashed:', err?.message || err);
    await query(`UPDATE simulations SET status='failed', error=$2 WHERE id=$1`,
      [sim.id, String(err?.message || err).slice(0, 4000)]).catch(() => {});
  });
  return sim;
}

async function execute(id, profileData, config) {
  await query(`UPDATE simulations SET status='running' WHERE id=$1`, [id]);
  const transcript = await runSimulatedConversation({
    profileData, condition: config.condition, turns: config.turns, llm: realLlm,
  });
  await query(
    `UPDATE simulations SET status='done', transcript=$2 WHERE id=$1`,
    [id, JSON.stringify(transcript)]
  );
}

export async function listSimulations(limit = 100) {
  const { rows } = await query(
    `SELECT s.id, s.created_at, s.status, s.source_type, s.source_session_id,
            s.config, s.error,
            COALESCE(sess.phase_b->>'career', s.persona->>'career') AS career
     FROM simulations s
     LEFT JOIN sessions sess ON sess.id = s.source_session_id
     ORDER BY s.created_at DESC LIMIT $1`, [limit]);
  return rows;
}

export async function getSimulation(id) {
  const { rows } = await query(`SELECT * FROM simulations WHERE id=$1`, [id]);
  return rows[0] || null;
}
