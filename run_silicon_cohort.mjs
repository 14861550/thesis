#!/usr/bin/env node
/*
 * run_silicon_cohort.mjs — end-to-end silicon-cohort method validation.
 *
 *   Pass A (this script): real cohort profiles -> participant LLM (Opus) plays
 *     each student through the SAME future-self bot (Sonnet) + self-reports the
 *     IBM questionnaires -> canonical study JSONs.
 *   Pass B (spawns Python): the eval_pipeline judge (Sonnet) predicts those
 *     ratings from the transcript across persona depth x prompt structure ->
 *     agreement metrics + report.
 *
 * Participant model (Opus) != judge model (Sonnet) -> no trivial self-agreement.
 * Needs ANTHROPIC_API_KEY. This is METHOD VALIDATION on simulated participants,
 * NOT human ground truth.
 *
 * Usage:
 *   node run_silicon_cohort.mjs --csv data/cohort_100.csv --n 5 \
 *     --phase-c-turns 5 --participant-model claude-opus-4-6 --depths D0,D1,D2,D3 --k 5
 *   (start with --n 1 to eyeball one persona before scaling; --skip-eval = Pass A only)
 */

import './lib/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runCohortToDir } from './lib/silicon_cohort.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const a = {};
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i].startsWith('--')) {
      const key = v[i].slice(2);
      const next = v[i + 1];
      if (next === undefined || next.startsWith('--')) a[key] = true;
      else { a[key] = next; i++; }
    }
  }
  return a;
}

async function main() {
  const a = parseArgs();
  const csv = a.csv || 'data/cohort_100.csv';
  const csvPath = path.isAbsolute(csv) ? csv : path.join(ROOT, csv);
  if (!fs.existsSync(csvPath)) {
    console.error(`Cohort CSV not found: ${csvPath}\nRun scripts/select_cohort.py first.`);
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set — Pass A needs it for real LLM calls. Add it to .env.');
    process.exit(1);
  }

  const n = a.n ? parseInt(a.n, 10) : 5;
  const phaseBTurns = a['phase-b-turns'] !== undefined ? parseInt(a['phase-b-turns'], 10) : 2;
  const phaseCTurns = a['phase-c-turns'] !== undefined ? parseInt(a['phase-c-turns'], 10) : 5;
  const participantModel = a['participant-model'] || 'claude-opus-4-6';
  const botModel = a['bot-model'] || 'claude-sonnet-4-6';
  const depths = a.depths || 'D0,D1,D2,D3';
  const structures = a.structures || 'structured';
  const k = a.k ? parseInt(a.k, 10) : 5;
  const concurrency = a.concurrency !== undefined ? parseInt(a.concurrency, 10) : 1;

  const base = path.join(ROOT, 'eval_pipeline', 'out', `silicon_${Date.now()}`);
  const sessionsDir = path.join(base, 'sessions');
  const evalDir = path.join(base, 'eval');

  console.log(`\nSilicon cohort — Pass A`);
  console.log(`  cohort:      ${csvPath}`);
  console.log(`  participants:${n}   participant=${participantModel}  bot=${botModel}`);
  console.log(`  turns:       phaseB=${phaseBTurns}  phaseC=${phaseCTurns}`);
  console.log(`  out:         ${base}\n`);

  const t0 = Date.now();
  await runCohortToDir({
    csvPath, n, phaseBTurns, phaseCTurns, participantModel, botModel, concurrency,
    outDir: sessionsDir,
    onProgress: (done, total, pid, reused) =>
      console.log(`  [${String(done).padStart(3)}/${total}] ${pid}  (${((Date.now() - t0) / 1000).toFixed(0)}s)${reused ? ' [resumed]' : ''}`),
  });
  console.log(`\nPass A done — ${n} study JSON(s) in ${sessionsDir}`);

  if (a['skip-eval']) {
    console.log('\n--skip-eval set: stopping after Pass A.');
    return;
  }

  // --- Pass B: eval_pipeline judge (Sonnet) over the silicon sessions --------
  fs.mkdirSync(evalDir, { recursive: true });
  const args = ['-m', 'eval_pipeline.run_eval',
    '--sessions-dir', sessionsDir, '--use-real',
    '--depths', depths, '--structures', structures, '--n-runs', String(k),
    '--out-dir', evalDir, '--summary-json', path.join(evalDir, 'summary.json'),
    '--run-label', 'Silicon cohort — method validation (LLM↔LLM, real inputs), not human ground truth'];
  console.log(`\nPass B — judge=Sonnet  depths=${depths}  structures=${structures}  k=${k}`);
  console.log(`  python3 ${args.join(' ')}\n`);

  const py = spawn(process.env.PYTHON_BIN || 'python3', args, {
    cwd: ROOT, env: { ...process.env, PYTHONHASHSEED: '0', PYTHONPATH: ROOT }, stdio: 'inherit',
  });
  py.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✓ Done. Report: ${path.join(evalDir, 'report.html')}`);
      console.log('  NOTE: silicon cohort = method validation (LLM↔LLM), not human agreement.');
    } else {
      console.error(`\nPass B failed (exit ${code}).`);
      process.exit(code || 1);
    }
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
