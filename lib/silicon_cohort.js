/*
 * lib/silicon_cohort.js — Pass A of the silicon-cohort method validation.
 *
 * For each real cohort profile: a participant LLM (default Opus) plays the
 * student, (1) self-reports the PRE questionnaire, (2) optionally does a short
 * Phase-B career chat with the guide bot, (3) does the Phase-C future-self chat
 * with the SAME Sonnet bot the humans used, (4) self-reports the POST
 * questionnaire. The result is a canonical `study` JSON — identical shape to a
 * real session — so Pass B (eval_pipeline judge, default Sonnet) reads it
 * unchanged. Participant model != judge model = no trivial self-agreement.
 *
 * LLMs are injectable, so the whole assembly is unit-tested offline with stubs.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  runConversation, makeClaudeLlm, PHASE_B_NUDGE, PHASE_C_NUDGE, profileDataFromStudy,
} from './simulator.js';
import {
  buildPhaseBPrompt, buildSystemPrompt, buildSimulatorPersonaPrompt,
  buildSelfReportPrompt, selfReportItemIds, selfReportItemRanges, buildQuestionnairePersonaPrompt,
} from './prompt.js';
import { loadCohort } from './personas.js';

function parseJsonObject(text) {
  const m = (text || '').match(/\{[\s\S]*\}/);
  if (!m) return {};
  try { return JSON.parse(m[0]); } catch { return {}; }
}

/** Run `worker` over `items` with bounded concurrency; preserves result order. */
async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
    for (let i = next++; i < items.length; i = next++) {
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
  return results;
}

/** A finished, re-usable session file (for --resume): valid JSON with a POST report. */
function validStudyFile(p) {
  try {
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    return s?.postSurvey?.ios_post != null && s?.phaseC?.transcript?.length > 0;
  } catch { return false; }
}

/** The persona answers one questionnaire phase; returns {item_id: int} clamped
 *  to EACH item's own scale (default 1-7; CDSE-SA 1-5, CIP-CCA 1-6 — §14b). */
export async function elicitSelfReport(profileData, transcript, phase, llm, personaText = null) {
  const { system, user } = buildSelfReportPrompt(profileData, { phase, transcript, personaText });
  const raw = await llm(system, [{ role: 'user', content: user }]);
  const obj = parseJsonObject(raw);
  const ranges = selfReportItemRanges(phase);
  const out = {};
  for (const id of selfReportItemIds(phase)) {
    const max = ranges[id] || 7;
    const v = Math.round(Number(obj[id]));
    out[id] = Number.isFinite(v) ? Math.max(1, Math.min(max, v)) : Math.round((1 + max) / 2);
  }
  return out;
}

/** Run one persona end-to-end → canonical `study` JSON. */
export async function runOnePersona({
  profileData, participantLlm, botLlm, phaseBTurns = 2, phaseCTurns = 5,
}) {
  const participantSystem = buildSimulatorPersonaPrompt(profileData);

  // (1) PRE self-report (before any chat)
  const pre = await elicitSelfReport(profileData, [], 'pre', participantLlm);

  // (2) optional short Phase-B career chat (gives D2 "own words")
  let transcriptB = [];
  if (phaseBTurns > 0) {
    transcriptB = await runConversation({
      botSystem: buildPhaseBPrompt(profileData),
      participantSystem, openerNudge: PHASE_B_NUDGE, turns: phaseBTurns,
      botLlm, participantLlm,
    });
  }

  // (3) Phase-C future-self chat (the same bot humans used)
  const transcriptC = await runConversation({
    botSystem: buildSystemPrompt(profileData, ''),
    participantSystem, openerNudge: PHASE_C_NUDGE, turns: phaseCTurns,
    botLlm, participantLlm,
  });

  // (4) POST self-report (after the chat)
  const post = await elicitSelfReport(profileData, transcriptC, 'post', participantLlm);

  const turnCount = transcriptC.filter((m) => m.role === 'user').length;
  return {
    meta: { condition: 'main', version: 'silicon-1', completedAt: new Date().toISOString(), synthetic: true },
    profile: { name: profileData._pid, color: '#b5552f' },
    preSurvey: {
      age: profileData.demographics?.age,
      gender: profileData.demographics?.gender,
      year: profileData.year,
      ...pre,
    },
    scores: { bigFive: profileData.bigFive, riasec: profileData.riasec, values: profileData.values },
    phaseB: {
      career: profileData.career,
      familiarity: profileData.familiarity,
      interestStrength: profileData.interestStrength,
      transcript: transcriptB,
    },
    phaseC: { transcript: transcriptC, durationSec: phaseCTurns * 60, turnCount },
    postSurvey: { ...post, interview: false },
  };
}

/** Run the whole cohort (Pass A) and write one <pid>.json per persona. */
export async function runCohortToDir({
  csvPath, n, phaseBTurns = 2, phaseCTurns = 5,
  participantModel = 'claude-opus-4-6', botModel = 'claude-sonnet-4-6',
  outDir, llms, onProgress, concurrency = 1, resume = true,
}) {
  const personas = loadCohort(csvPath, { limit: n });
  const participantLlm = llms?.participant || makeClaudeLlm(participantModel);
  const botLlm = llms?.bot || makeClaudeLlm(botModel);
  fs.mkdirSync(outDir, { recursive: true });

  let done = 0;
  const paths = await runPool(personas, concurrency, async (persona) => {
    const p = path.join(outDir, `${persona._pid}.json`);
    if (resume && validStudyFile(p)) {              // already produced — reuse (parallel-safe resume)
      onProgress?.(++done, personas.length, persona._pid, true);
      return p;
    }
    const study = await runOnePersona({
      profileData: persona, participantLlm, botLlm, phaseBTurns, phaseCTurns,
    });
    fs.writeFileSync(p, JSON.stringify(study));
    onProgress?.(++done, personas.length, persona._pid);
    return p;
  });
  return paths;
}

// --- Run 2: reconstruct the participant from ONLY the questionnaire ----------
// Reconstruction ablation (single factor = persona information source; model held
// fixed). For each Run-1 session: keep the SAME future-self bot (full profile) and
// SAME model, but rebuild the PARTICIPANT persona from only its baseline
// questionnaire (demographics + chosen career + pre IBM self-report) — no Big
// Five/RIASEC. Compare Run-1 vs Run-2 outcomes (paired by participant) to see how
// much the rich profile drives the simulated outcomes.
export async function runReconstructionFromSessions({
  sourceDir, outDir, phaseCTurns = 5, llms, onProgress, concurrency = 1, resume = true,
}) {
  const participantLlm = llms?.participant || makeClaudeLlm('claude-sonnet-4-6');
  const botLlm = llms?.bot || makeClaudeLlm('claude-sonnet-4-6');
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.json')).sort();

  let done = 0;
  const paths = await runPool(files, concurrency, async (file) => {
    const outPath = path.join(outDir, file);
    if (resume && validStudyFile(outPath)) {        // already produced — reuse (parallel-safe resume)
      onProgress?.(++done, files.length, file.replace(/\.json$/, ''), true);
      return outPath;
    }
    const src = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
    const pre = src.preSurvey || {};
    const career = (src.phaseB && src.phaseB.career) || 'a career you are exploring';
    const botProfile = profileDataFromStudy(src);                  // bot identical to Run 1 (full profile)
    const participantSystem = buildQuestionnairePersonaPrompt(pre, career); // participant from questionnaire only

    const transcriptC = await runConversation({
      botSystem: buildSystemPrompt(botProfile, ''),
      participantSystem, openerNudge: PHASE_C_NUDGE, turns: phaseCTurns,
      botLlm, participantLlm,
    });
    const post = await elicitSelfReport({}, transcriptC, 'post', participantLlm, participantSystem);

    const pid = src.profile?.name || file.replace(/\.json$/, '');
    const turnCount = transcriptC.filter((m) => m.role === 'user').length;
    const study = {
      meta: { condition: 'main', version: 'silicon-recon-1', completedAt: new Date().toISOString(), synthetic: true, reconstructedFrom: 'questionnaire' },
      profile: { name: pid, color: '#b5552f' },
      preSurvey: pre,                                              // carried from Run 1 (the reconstruction input)
      scores: src.scores || {},                                   // kept for traceability (the bot used it)
      phaseB: { career, familiarity: src.phaseB?.familiarity, interestStrength: src.phaseB?.interestStrength, transcript: [] },
      phaseC: { transcript: transcriptC, durationSec: phaseCTurns * 60, turnCount },
      postSurvey: { ...post, interview: false },
    };
    const p = path.join(outDir, `${pid}.json`);
    fs.writeFileSync(p, JSON.stringify(study));
    onProgress?.(++done, files.length, pid);
    return p;
  });
  return paths;
}
