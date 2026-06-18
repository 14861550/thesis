/* Prompt-behaviour QA — checks the two manipulation effects the role-play must
 * produce, on the REAL prompts from lib/prompt.js:
 *   1) reply length VARIES (short questions get short replies; only big ones run long)
 *   2) answers/advice are GROUNDED in the 10-years-future reality (the work + the
 *      skills have changed), across different career types — not just tech.
 *
 * Generation needs a model; measurement does not. Two modes:
 *   • node test/prompt_behavior_check.mjs                 (if a model is configured
 *       via LLM_BASE_URL+UVA_API_TOKEN [the study's gpt-5.1 proxy] or
 *       ANTHROPIC_API_KEY, it runs each scripted conversation and measures it.)
 *   • node test/prompt_behavior_check.mjs --measure <dir> (measure pre-generated
 *       transcripts dir/bot_<career>.json — e.g. produced by any model or a
 *       role-play stand-in when no key is available in the sandbox.)
 *
 * Exit code is non-zero if a check fails, so it can gate CI/fielding.
 */
import { buildSystemPrompt } from '../lib/prompt.js';
import { readFileSync } from 'fs';
import path from 'path';

// Different career TYPES on purpose — analytical, clinical, caring — so the
// future-grounding check can't pass on tech careers alone.
const PERSONAS = {
  data_analyst: { career: 'Data analyst', demographics: { age: 21, study_year: 'Third year', major: 'Psychology' }, bigFive: { O: 5.5, C: 4, E: 3.5, A: 5, ES: 3.5 }, riasec: { I: 6, A: 5, S: 4 }, values: ['Achievement'], familiarity: 3, interestStrength: 6, location: 'Amsterdam' },
  nurse: { career: 'Registered nurse', demographics: { age: 20, study_year: 'Second year', major: 'Biomedical Sciences' }, bigFive: { O: 4, C: 5.5, E: 4.5, A: 6, ES: 4 }, riasec: { S: 6, I: 5, R: 4 }, values: ['Relationships'], familiarity: 4, interestStrength: 6, location: 'Rotterdam' },
  teacher: { career: 'Primary school teacher', demographics: { age: 20, study_year: 'Second year', major: 'Education' }, bigFive: { O: 4.5, C: 5, E: 5, A: 6, ES: 4.5 }, riasec: { S: 6, A: 5, E: 4 }, values: ['Relationships'], familiarity: 4, interestStrength: 6, location: 'Utrecht' },
};

// Scripted participant turns chosen to span a real range of expected lengths.
export const TURNS = [
  { kind: 'light', text: 'hey… this is so weird haha. hi?' },
  { kind: 'trivial', text: 'wait, what do i even call you?' },
  { kind: 'big', text: 'what does a normal day actually look like for you now?' },
  { kind: 'advice', text: 'what should I actually focus on learning right now to get there?' },
  { kind: 'medium', text: 'do you ever regret picking this?' },
  { kind: 'throwaway', text: 'lol ok same' },
  { kind: 'big', text: 'honestly, what was the hardest part of getting here?' },
  { kind: 'closing', text: 'ok this really helped. thank you' },
];

export function specFor(key) {
  const p = PERSONAS[key];
  return { career: p.career, system: buildSystemPrompt(p, 'They were drawn to this direction in phase B.', p.location), turns: TURNS };
}

const SHORT = new Set(['light', 'trivial', 'throwaway', 'closing']);
// Broad "the world/work changed over a decade" detector (works across fields).
const RE_FUTURE = /\bAI\b|automat|machine|algorithm|\bmodels?\b|the systems?\b|\btools?\b|offload|flag|run themselves|no longer|used to|these days|nowadays|by now|decade|ten years|wearable|sensor|patch(es)?|software|digital|generate|draft|hold for you/i;
const words = (s) => (String(s).trim().match(/\S+/g) || []).length;
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

// Absolute ceilings (the real complaint was walls of text): short turns must be
// genuinely short, and no reply may be a wall. Caps allow measurement slack over
// the prompt's ~40w / ~110w targets.
const SHORT_MAX = 65;   // mean words on light/trivial/throwaway/closing turns (a few sentences)
const REPLY_MAX = 230;  // any single reply — the Build Plan allows "2–3 short paragraphs"
                        // for big questions (~200w); this flags true walls (300w+), not those.

export function measure(key, replies) {
  const turns = TURNS;
  const wc = replies.map(words);
  const shortMean = mean(wc.filter((_, i) => SHORT.has(turns[i].kind)));
  const bigMean = mean(wc.filter((_, i) => ['big', 'advice'].includes(turns[i].kind)));
  const varies = bigMean > shortMean * 1.8 && Math.max(...wc) >= Math.min(...wc) * 3;
  const notVerbose = shortMean <= SHORT_MAX && Math.max(...wc) <= REPLY_MAX;
  // future-grounding required on the career-substantive day-to-day + advice turns
  const keyIdx = turns.map((t, i) => ({ t, i })).filter((x) => ['big', 'advice'].includes(x.t.kind) && /day|learn|focus/i.test(x.t.text)).map((x) => x.i);
  const futureOK = keyIdx.every((i) => RE_FUTURE.test(replies[i]));
  return { career: PERSONAS[key].career, shortMean, bigMean, range: [Math.min(...wc), Math.max(...wc)], varies, notVerbose, futureOK, pass: varies && notVerbose && futureOK };
}

function report(results) {
  let ok = true;
  for (const r of results) {
    console.log(`${r.career}: short~${r.shortMean.toFixed(0)}w big/advice~${r.bigMean.toFixed(0)}w range ${r.range[0]}-${r.range[1]}w | varies: ${r.varies ? 'PASS' : 'FAIL'} | not-verbose: ${r.notVerbose ? 'PASS' : 'FAIL'} | future(day/advice): ${r.futureOK ? 'PASS' : 'FAIL'}`);
    ok = ok && r.pass;
  }
  console.log(ok ? '\nPROMPT BEHAVIOUR CHECK PASSED ✅' : '\nPROMPT BEHAVIOUR CHECK FAILED ❌');
  return ok;
}

// --- optional model call (study proxy = OpenAI-compatible; else Anthropic) -----
async function callModel(system, history) {
  const base = (process.env.LLM_BASE_URL || '').replace(/\/+$/, '');
  const token = process.env.UVA_API_TOKEN || '';
  const model = process.env.LLM_MODEL || 'gpt-5.1';
  if (base && token) {
    // Mirror the app's call (server.js): temperature + generous max_tokens, and
    // retry transient upstream 5xx/empties (the proxy 500s intermittently) so the
    // test reflects the app's resilient behaviour rather than its own gaps.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const r = await fetch(`${base}/chat/completions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ model, temperature: Number(process.env.LLM_TEMPERATURE ?? 0.9), max_tokens: Number(process.env.LLM_MAX_TOKENS ?? 16384), messages: [{ role: 'system', content: system }, ...history] }),
        });
        if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 1200 * (attempt + 1))); continue; }
        const j = await r.json();
        const txt = (j.choices?.[0]?.message?.content || '').trim();
        if (txt) return txt;
      } catch (e) { /* retry */ }
      await new Promise((s) => setTimeout(s, 1200 * (attempt + 1)));
    }
    return '';
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const a = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const m = await a.messages.create({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 1024, system, messages: history });
    return m.content?.[0]?.text || '';
  }
  return null;
}

async function generate(key) {
  const { system } = specFor(key);
  const history = []; const replies = [];
  for (const t of TURNS) {
    history.push({ role: 'user', content: t.text });
    const reply = await callModel(system, history);
    if (reply == null) return null; // no model configured
    replies.push(reply);
    history.push({ role: 'assistant', content: reply });
  }
  try { (await import('fs')).writeFileSync(`/tmp/gen_${key}.json`, JSON.stringify(replies, null, 1)); } catch (e) {}
  return replies;
}

async function main() {
  const args = process.argv.slice(2);
  const mi = args.indexOf('--measure');
  const keys = Object.keys(PERSONAS);
  const results = [];
  if (mi >= 0) {
    const dir = args[mi + 1] || '/tmp';
    for (const k of keys) {
      try {
        const replies = JSON.parse(readFileSync(path.join(dir, `bot_${k}.json`), 'utf8'));
        if (replies.length !== TURNS.length) { console.log(`(skip ${k}: ${replies.length} replies, expected ${TURNS.length})`); continue; }
        results.push(measure(k, replies));
      } catch (e) { console.log(`(skip ${k}: ${e.message})`); }
    }
    if (!results.length) { console.log('No transcripts found in', dir, '(expected bot_<career>.json).'); process.exit(2); }
  } else {
    for (const k of keys) {
      const replies = await generate(k);
      if (!replies) {
        console.log('No model configured. Set LLM_BASE_URL+UVA_API_TOKEN (study gpt-5.1) or ANTHROPIC_API_KEY,');
        console.log('or run:  node test/prompt_behavior_check.mjs --measure <dir-with-bot_*.json>');
        process.exit(0);
      }
      results.push(measure(k, replies));
    }
  }
  process.exit(report(results) ? 0 : 1);
}

main();
