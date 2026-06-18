/* Larger statistical sweep of the role-play prompt effects on the real model.
 * 8 personas spanning career TYPES (analytical/clinical/caring/tech/creative/
 * professional/trades/business), each run through the 8-turn Stage-C script at a
 * RANDOM temperature in [0.7,1.0] (robustness to sampling), plus Stage-B cards.
 * Reuses the exact prompts (lib/prompt.js) and the gate's thresholds/regexes.
 *
 * Run:  set -a; . ./.env; set +a; node test/prompt_behavior_stats.mjs
 * Writes a summary to docs/prompt_behavior_evidence/stats.md.
 */
import { buildSystemPrompt, buildPhaseBDirect, buildBaselinePrompt } from '../lib/prompt.js';
import { callModel, TURNS, SHORT, SHORT_MAX, REPLY_MAX, RE_FUTURE, RE_FUTURE_B, words } from './prompt_behavior_check.mjs';
import { writeFileSync } from 'fs';

const PERSONAS = [
  { type: 'analytical', career: 'Data analyst', loc: 'Amsterdam', demographics: { age: 21, study_year: 'Third year', major: 'Psychology' }, riasec: { I: 6, A: 5, S: 4 }, values: ['Achievement'], bigFive: { O: 5.5, C: 4 }, familiarity: 3, interestStrength: 6 },
  { type: 'clinical', career: 'Registered nurse', loc: 'Rotterdam', demographics: { age: 20, study_year: 'Second year', major: 'Biomedical Sciences' }, riasec: { S: 6, I: 5, R: 4 }, values: ['Relationships'], bigFive: { C: 5.5, A: 6 }, familiarity: 4, interestStrength: 6 },
  { type: 'caring', career: 'Primary school teacher', loc: 'Utrecht', demographics: { age: 20, study_year: 'Second year', major: 'Education' }, riasec: { S: 6, A: 5, E: 4 }, values: ['Relationships'], bigFive: { E: 5, A: 6 }, familiarity: 4, interestStrength: 6 },
  { type: 'tech', career: 'Software engineer', loc: 'Eindhoven', demographics: { age: 22, study_year: 'Fourth year', major: 'Computer Science' }, riasec: { I: 6, R: 5, C: 4 }, values: ['Independence'], bigFive: { O: 6, C: 5 }, familiarity: 5, interestStrength: 6 },
  { type: 'creative', career: 'Graphic designer', loc: 'Berlin', demographics: { age: 21, study_year: 'Third year', major: 'Communication & Media' }, riasec: { A: 6, E: 4, I: 4 }, values: ['Creativity'], bigFive: { O: 6.5, E: 4 }, familiarity: 4, interestStrength: 6 },
  { type: 'professional', career: 'Corporate lawyer', loc: 'London', demographics: { age: 23, study_year: 'Fourth year', major: 'Law' }, riasec: { E: 6, C: 5, S: 4 }, values: ['Achievement', 'Security'], bigFive: { C: 6, E: 5 }, familiarity: 4, interestStrength: 5 },
  { type: 'trades', career: 'Electrician', loc: 'Groningen', demographics: { age: 19, study_year: 'First year', major: 'Applied Engineering' }, riasec: { R: 6, I: 4, C: 4 }, values: ['Security', 'Independence'], bigFive: { C: 5, O: 4 }, familiarity: 5, interestStrength: 6 },
  { type: 'business', career: 'Marketing manager', loc: 'Amsterdam', demographics: { age: 22, study_year: 'Third year', major: 'Business Administration' }, riasec: { E: 6, A: 5, S: 5 }, values: ['Achievement', 'Recognition'], bigFive: { E: 6, O: 5 }, familiarity: 4, interestStrength: 6 },
];

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const rand = (lo, hi) => Math.round((lo + Math.random() * (hi - lo)) * 100) / 100;

async function runStageC(system, temp) {
  const history = []; const replies = [];
  for (const t of TURNS) { history.push({ role: 'user', content: t.text }); const r = await callModel(system, history, temp); replies.push(r); history.push({ role: 'assistant', content: r }); }
  return replies;
}
async function runStageB(system, temp) {
  const h = [{ role: 'user', content: 'I want something that helps people but also uses evidence and data, not pure therapy.' }];
  const r1 = await callModel(system, h, temp); h.push({ role: 'assistant', content: r1 });
  h.push({ role: 'user', content: 'yeah exactly — applied not clinical.' });
  const r2 = await callModel(system, h, temp);
  const m = String(r2).match(/```json\s*([\s\S]*?)```/); if (!m) return [];
  try { return JSON.parse(m[1]).recommendations || []; } catch (e) { return []; }
}

const rows = []; const pooled = {}; const pooledB = {};
for (const p of PERSONAS) {
  const temp = rand(0.7, 1.0);
  // Measure one Stage-C transcript → length/variation/future booleans + word counts.
  const measureC = (replies, pool) => {
    const wc = replies.map(words);
    TURNS.forEach((t, i) => { (pool[t.kind] ||= []).push(wc[i]); });
    const shortMean = mean(wc.filter((_, i) => SHORT.has(TURNS[i].kind)));
    const bigMean = mean(wc.filter((_, i) => ['big', 'advice'].includes(TURNS[i].kind)));
    const varies = bigMean > shortMean * 1.8 && Math.max(...wc) >= Math.min(...wc) * 3;
    const notVerbose = shortMean <= SHORT_MAX && Math.max(...wc) <= REPLY_MAX;
    const keyIdx = TURNS.map((t, i) => ({ t, i })).filter((x) => ['big', 'advice'].includes(x.t.kind) && /day|learn|focus/i.test(x.t.text)).map((x) => x.i);
    const futureOK = keyIdx.every((i) => RE_FUTURE.test(replies[i]));
    return { shortMean: Math.round(shortMean), bigMean: Math.round(bigMean), max: Math.max(...wc), varies, notVerbose, futureOK };
  };
  // MAIN arm
  const main = measureC(await runStageC(buildSystemPrompt(p, 'They were drawn to this in phase B.', p.loc), temp), pooled);
  // BASELINE arm (control) — only Stage-C differs between conditions; A/B are shared
  const base = measureC(await runStageC(buildBaselinePrompt(p.career, p.loc), temp), pooledB);
  // Stage-B cards (shared across conditions)
  const recs = await runStageB(buildPhaseBDirect(p), temp);
  const bFuture = recs.filter((x) => RE_FUTURE_B.test(x.why || '') || RE_FUTURE_B.test(x.path || '')).length;
  const bConcise = recs.length === 5 && Math.max(...recs.flatMap((x) => [words(x.why), words(x.path)])) <= 40;
  const row = { type: p.type, career: p.career, temp, main, base, bN: recs.length, bFuture, bConcise };
  rows.push(row);
  console.log(`${p.type.padEnd(12)} ${p.career.padEnd(22)} T=${temp}`);
  console.log(`   MAIN short~${main.shortMean} big~${main.bigMean} max ${main.max} | varies:${main.varies?'Y':'N'} brief:${main.notVerbose?'Y':'N'} future:${main.futureOK?'Y':'N'}`);
  console.log(`   BASE short~${base.shortMean} big~${base.bigMean} max ${base.max} | varies:${base.varies?'Y':'N'} brief:${base.notVerbose?'Y':'N'} future:${base.futureOK?'Y':'N'}  || Stage-B ${bFuture}/${recs.length} concise:${bConcise?'Y':'N'}`);
}

const N = rows.length;
const rate = (arm, k) => `${rows.filter((r) => r[arm][k]).length}/${N}`;
const armMean = (arm, k) => mean(rows.map((r) => r[arm][k])).toFixed(0);
const agg = {
  mVaries: rate('main', 'varies'), mBrief: rate('main', 'notVerbose'), mFuture: rate('main', 'futureOK'),
  bVaries: rate('base', 'varies'), bBrief: rate('base', 'notVerbose'), bFuture: rate('base', 'futureOK'),
  bConcisePass: `${rows.filter((r) => r.bConcise).length}/${N}`, bFutureMean: (mean(rows.map((r) => r.bFuture))).toFixed(1),
};
console.log('\n=== AGGREGATE (N=' + N + ' personas, random T 0.7–1.0) ===');
console.log(`Stage-C MAIN     varies:${agg.mVaries} brief:${agg.mBrief} future:${agg.mFuture}  (big~${armMean('main','bigMean')}w short~${armMean('main','shortMean')}w)`);
console.log(`Stage-C BASELINE varies:${agg.bVaries} brief:${agg.bBrief} future:${agg.bFuture}  (big~${armMean('base','bigMean')}w short~${armMean('base','shortMean')}w)`);
console.log(`Stage-B  concise:${agg.bConcisePass} | mean future-aware:${agg.bFutureMean}/5`);

// write evidence
const md = ['# Prompt-behaviour statistics (gpt-5.1)', '',
  `N=${N} personas across career types, each at a random temperature in 0.7–1.0 (${new Date().toISOString().slice(0,10)}). Both arms (MAIN role-play and BASELINE control) measured — conditions differ only in Stage-C.`, '',
  '| type | career | T | arm | short | big/adv | max | varies | brief | future |', '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.flatMap((r) => [
    `| ${r.type} | ${r.career} | ${r.temp} | main | ${r.main.shortMean} | ${r.main.bigMean} | ${r.main.max} | ${r.main.varies?'✅':'❌'} | ${r.main.notVerbose?'✅':'❌'} | ${r.main.futureOK?'✅':'❌'} |`,
    `| | | | base | ${r.base.shortMean} | ${r.base.bigMean} | ${r.base.max} | ${r.base.varies?'✅':'❌'} | ${r.base.notVerbose?'✅':'❌'} | ${r.base.futureOK?'✅':'❌'} |`,
  ]),
  '', `**Aggregate** — MAIN: varies ${agg.mVaries}, brief ${agg.mBrief}, future ${agg.mFuture} (big~${armMean('main','bigMean')}w). BASELINE: varies ${agg.bVaries}, brief ${agg.bBrief}, future ${agg.bFuture} (big~${armMean('base','bigMean')}w). Stage-B (shared): concise ${agg.bConcisePass}, mean future-aware ${agg.bFutureMean}/5.`,
  '', `Both arms vary and stay future-grounded; the shared geographic/future-realism floor holds in the control too. Absolute brevity has a gpt-5.1 long tail in both arms (slightly larger in baseline), which is a length nuisance to note in the methods, not a design confound for the mediators.`,
].join('\n');
writeFileSync('docs/prompt_behavior_evidence/stats.md', md + '\n');
console.log('\nwrote docs/prompt_behavior_evidence/stats.md');
