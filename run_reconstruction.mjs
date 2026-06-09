#!/usr/bin/env node
/*
 * run_reconstruction.mjs — Run 2 of the persona-reconstruction ablation.
 *
 * Single factor = persona INFORMATION SOURCE (model held fixed at Sonnet).
 *   Run 1 (reference): full-profile persona  → run with
 *       node run_silicon_cohort.mjs --participant-model claude-sonnet-4-6 \
 *            --phase-b-turns 0 --skip-eval        (Sonnet, full profile)
 *   Run 2 (this script): rebuild each participant from ONLY its baseline
 *       questionnaire (demographics + chosen career + pre IBM self-report), same
 *       Sonnet model, the SAME future-self bot → new conversation + post-report.
 * Then: python3 scripts/compare_runs.py --run1 <run1 sessions> --run2 <out>
 *
 * Needs ANTHROPIC_API_KEY. Both arms on Sonnet, so a difference is attributable
 * to the persona source, not the model.
 *
 * Usage:
 *   node run_reconstruction.mjs --source eval_pipeline/out/silicon_<ts>/sessions \
 *     --phase-c-turns 5 [--participant-model claude-sonnet-4-6]
 */

import './lib/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReconstructionFromSessions } from './lib/silicon_cohort.js';
import { makeClaudeLlm } from './lib/simulator.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const a = {}; const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i].startsWith('--')) {
      const k = v[i].slice(2); const next = v[i + 1];
      if (next === undefined || next.startsWith('--')) a[k] = true; else { a[k] = next; i++; }
    }
  }
  return a;
}

function newestSessionsDir() {
  const out = path.join(ROOT, 'eval_pipeline', 'out');
  if (!fs.existsSync(out)) return null;
  const dirs = fs.readdirSync(out).filter((d) => d.startsWith('silicon_'))
    .map((d) => path.join(out, d, 'sessions'))
    .filter((d) => fs.existsSync(d) && fs.readdirSync(d).some((f) => f.endsWith('.json')))
    .sort();
  return dirs.length ? dirs[dirs.length - 1] : null;
}

async function main() {
  const a = parseArgs();
  const source = a.source ? (path.isAbsolute(a.source) ? a.source : path.join(ROOT, a.source)) : newestSessionsDir();
  if (!source || !fs.existsSync(source)) {
    console.error('No source sessions dir. Pass --source <Run-1 sessions dir> (run run_silicon_cohort.mjs first).');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set — Run 2 needs it for real LLM calls. Add it to .env.');
    process.exit(1);
  }
  const participantModel = a['participant-model'] || 'claude-sonnet-4-6';
  const botModel = a['bot-model'] || 'claude-sonnet-4-6';
  const phaseCTurns = a['phase-c-turns'] !== undefined ? parseInt(a['phase-c-turns'], 10) : 5;
  const concurrency = a.concurrency !== undefined ? parseInt(a.concurrency, 10) : 1;
  const outDir = a.out ? (path.isAbsolute(a.out) ? a.out : path.join(ROOT, a.out))
    : path.join(ROOT, 'eval_pipeline', 'out', `silicon_recon_${Date.now()}`, 'sessions');

  const n = fs.readdirSync(source).filter((f) => f.endsWith('.json')).length;
  console.log(`\nRun 2 — questionnaire-only reconstruction (model held = Sonnet)`);
  console.log(`  source (Run 1): ${source}  (${n} sessions)`);
  console.log(`  participant=${participantModel}  bot=${botModel}  phaseC=${phaseCTurns}  concurrency=${concurrency}`);
  console.log(`  out:            ${outDir}\n`);

  const t0 = Date.now();
  await runReconstructionFromSessions({
    sourceDir: source, outDir, phaseCTurns, concurrency,
    llms: { participant: makeClaudeLlm(participantModel), bot: makeClaudeLlm(botModel) },
    onProgress: (d, t, pid, reused) => console.log(`  [${String(d).padStart(3)}/${t}] ${pid}  (${((Date.now() - t0) / 1000).toFixed(0)}s)${reused ? ' [resumed]' : ''}`),
  });
  console.log(`\n✓ Run 2 done — ${outDir}`);
  console.log(`Next: python3 scripts/compare_runs.py --run1 ${source} --run2 ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
