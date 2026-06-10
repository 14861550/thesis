/*
 * lib/results_routes.js — read-only, anonymized supervisor results surface.
 *
 * Gated by RESULTS_TOKEN (a read-only share link) OR ADMIN_TOKEN. Every payload
 * is de-identified and name-stripped: no contact/email, names replaced with
 * anonymous labels (P01, P02…). These routes never delete, never export PII,
 * never launch runs — they only read. If neither token is set, the surface is
 * disabled (503).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { dbEnabled } from './db.js';
import {
  exportStudies, getSessionRow, reconstructStudy, anonymizeStudy, deidentifyStudy,
} from './sessions.js';
import { listRuns, getRun } from './eval_runner.js';
import { listSimulations, getSimulation } from './simulator.js';
import { query } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const SHOWCASE_FILE = path.join(__dirname, '..', 'showcase', 'silicon_cohort.html');

const resultsConfigured = () => Boolean(process.env.RESULTS_TOKEN || process.env.ADMIN_TOKEN);
const validToken = (t) =>
  (process.env.RESULTS_TOKEN && t === process.env.RESULTS_TOKEN) ||
  (process.env.ADMIN_TOKEN && t === process.env.ADMIN_TOKEN);

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function tokenFromReq(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const c = parseCookies(req).results_token;
  if (c) return c;
  if (req.query && req.query.token) return String(req.query.token);
  return null;
}
function isHttps(req) {
  return req.secure || (req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https';
}
function cookieStr(name, val, req, maxAge = 2592000) {
  let s = `${name}=${encodeURIComponent(val)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
  if (isHttps(req)) s += '; Secure';
  return s;
}
function requireResults(req, res, next) {
  if (!resultsConfigured()) return res.status(503).json({ error: 'Results disabled: set RESULTS_TOKEN.' });
  if (!validToken(tokenFromReq(req))) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}
function requireDb(req, res, next) {
  if (!dbEnabled) return res.status(503).json({ error: 'Persistence disabled: set DATABASE_URL.' });
  next();
}

// --- outcome helpers (mirror eval_pipeline/loader.py wording) ----------------
const mean = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
function outcomesPre(study) {
  const p = study.preSurvey || {};
  return {
    continuity: mean([p.fscs_similar, p.fscs_connected, p.fscs_care]),
    vividness: mean([p.viv_clear, p.viv_tangible, p.viv_detail, p.viv_felt]),
    closeness: typeof p.ios_pre === 'number' ? p.ios_pre : null,
  };
}
function outcomesPost(study) {
  const p = study.postSurvey || {};
  return {
    continuity: mean([p.fscs_similar_post, p.fscs_connected_post, p.fscs_care_post]),
    vividness: mean([p.viv_clear_post, p.viv_tangible_post, p.viv_detail_post, p.viv_felt_post]),
    closeness: typeof p.ios_post === 'number' ? p.ios_post : null,
    manip_checks: mean([p.mc_style, p.mc_scene, p.mc_understand]),
  };
}
function deltas(study) {
  const pre = outcomesPre(study); const post = outcomesPost(study);
  const d = {};
  for (const k of ['continuity', 'vividness', 'closeness']) {
    d[k] = (pre[k] != null && post[k] != null) ? Number((post[k] - pre[k]).toFixed(2)) : null;
  }
  return { pre, post, delta: d };
}

/** Map completed-session uuid -> stable anon label (P01, P02…) by created order. */
async function anonLabelMap() {
  const { rows } = await query(
    `SELECT id FROM sessions WHERE status='completed' ORDER BY created_at ASC`
  );
  const map = new Map();
  rows.forEach((r, i) => map.set(r.id, 'P' + String(i + 1).padStart(2, '0')));
  return map;
}

const scrubText = (t) => (typeof t === 'string' ? t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]') : t);

export function mountResultsRoutes(app) {
  // --- gated page -----------------------------------------------------------
  app.get(['/results', '/results/'], (req, res) => {
    if (!resultsConfigured()) return res.status(503).send('Results disabled — set RESULTS_TOKEN in the server env.');
    const ok = validToken(tokenFromReq(req));
    res.sendFile(path.join(RESULTS_DIR, ok ? 'index.html' : 'login.html'));
  });
  // Silicon-cohort showcase (static, self-contained) — gated like the rest.
  app.get('/results/showcase', (req, res) => {
    if (!resultsConfigured()) return res.status(503).send('Results disabled — set RESULTS_TOKEN in the server env.');
    const ok = validToken(tokenFromReq(req));
    res.sendFile(ok ? SHOWCASE_FILE : path.join(RESULTS_DIR, 'login.html'));
  });
  app.post('/results/login', (req, res) => {
    if (!resultsConfigured()) return res.status(503).json({ error: 'Results disabled.' });
    const token = (req.body && req.body.token) || '';
    if (!validToken(token)) return res.status(401).json({ error: 'Invalid token.' });
    res.setHeader('Set-Cookie', cookieStr('results_token', token, req));
    res.json({ ok: true });
  });
  app.post('/results/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'results_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    res.json({ ok: true });
  });

  // --- overview: research so far -------------------------------------------
  app.get('/api/results/overview', requireResults, requireDb, async (req, res) => {
    try {
      const studies = await exportStudies({ status: 'completed', deidentify: true });
      const byCondition = {}; const byCareer = {};
      const dAcc = { continuity: [], vividness: [], closeness: [] };
      const postAcc = { continuity: [], vividness: [], closeness: [], manip_checks: [] };
      for (const s of studies) {
        const cond = s.meta?.condition || 'main';
        byCondition[cond] = (byCondition[cond] || 0) + 1;
        const career = s.phaseB?.career || '—';
        byCareer[career] = (byCareer[career] || 0) + 1;
        const { delta, post } = deltas(s);
        for (const k of ['continuity', 'vividness', 'closeness']) if (delta[k] != null) dAcc[k].push(delta[k]);
        for (const k of Object.keys(postAcc)) if (post[k] != null) postAcc[k].push(post[k]);
      }
      const round = (x) => (x == null ? null : Number(x.toFixed(2)));
      res.json({
        n_completed: studies.length,
        by_condition: byCondition,
        by_career: byCareer,
        mean_delta: {
          continuity: round(mean(dAcc.continuity)),
          vividness: round(mean(dAcc.vividness)),
          closeness: round(mean(dAcc.closeness)),
        },
        mean_post: {
          continuity: round(mean(postAcc.continuity)),
          vividness: round(mean(postAcc.vividness)),
          closeness: round(mean(postAcc.closeness)),
          manip_checks: round(mean(postAcc.manip_checks)),
        },
      });
    } catch (err) {
      console.error('results/overview failed:', err?.message || err);
      res.status(500).json({ error: 'Overview failed.' });
    }
  });

  // --- anonymized sessions list + detail -----------------------------------
  app.get('/api/results/sessions', requireResults, requireDb, async (req, res) => {
    try {
      const labels = await anonLabelMap();
      const { rows } = await query(
        `SELECT id, condition, status, created_at, completed_at,
                COALESCE((phase_c->>'turnCount')::int, 0) AS phase_c_turns,
                COALESCE(phase_b->>'career','') AS career
         FROM sessions WHERE status='completed' ORDER BY created_at ASC`
      );
      res.json(rows.map((r) => ({
        label: labels.get(r.id) || '—',
        condition: r.condition, status: r.status,
        career: r.career, phase_c_turns: r.phase_c_turns,
        created_at: r.created_at, completed_at: r.completed_at,
      })));
    } catch (err) {
      res.status(500).json({ error: 'List failed.' });
    }
  });

  app.get('/api/results/sessions/:label', requireResults, requireDb, async (req, res) => {
    try {
      const labels = await anonLabelMap();
      let id = null;
      for (const [sid, lbl] of labels) if (lbl === req.params.label) { id = sid; break; }
      if (!id) return res.status(404).json({ error: 'Not found.' });
      const row = await getSessionRow(id);
      if (!row) return res.status(404).json({ error: 'Not found.' });
      const label = labels.get(id);
      const study = anonymizeStudy(reconstructStudy(row), label);
      res.json({
        label, condition: row.condition, status: row.status,
        created_at: row.created_at, completed_at: row.completed_at,
        career: study.phaseB?.career || null,
        study, outcomes: deltas(study),
      });
    } catch (err) {
      res.status(500).json({ error: 'Load failed.' });
    }
  });

  // --- RQ results: eval runs (metrics only; clean labels, no buggy report) --
  app.get('/api/results/runs', requireResults, requireDb, async (req, res) => {
    try {
      const runs = await listRuns();
      res.json(runs.map((r) => ({
        id: r.id, created_at: r.created_at, status: r.status,
        config: r.config, summary: r.summary, error: r.error,
      })));
    } catch (err) {
      res.status(500).json({ error: 'List failed.' });
    }
  });
  app.get('/api/results/runs/:id', requireResults, requireDb, async (req, res) => {
    try {
      const run = await getRun(req.params.id);
      if (!run) return res.status(404).json({ error: 'Not found.' });
      res.json({
        id: run.id, created_at: run.created_at, status: run.status,
        config: run.config, summary: run.summary, error: run.error,
      });
    } catch (err) {
      res.status(500).json({ error: 'Load failed.' });
    }
  });

  // --- simulations: simulated vs real conversations ------------------------
  app.get('/api/results/simulations', requireResults, requireDb, async (req, res) => {
    try {
      const labels = await anonLabelMap();
      const sims = await listSimulations();
      res.json(sims.map((s) => ({
        id: s.id, created_at: s.created_at, status: s.status,
        source_label: s.source_session_id ? (labels.get(s.source_session_id) || '—') : '—',
        career: s.career || '—', config: s.config, error: s.error,
      })));
    } catch (err) {
      res.status(500).json({ error: 'List failed.' });
    }
  });

  app.get('/api/results/simulations/:id', requireResults, requireDb, async (req, res) => {
    try {
      const sim = await getSimulation(req.params.id);
      if (!sim) return res.status(404).json({ error: 'Not found.' });
      const labels = await anonLabelMap();
      const label = sim.source_session_id ? (labels.get(sim.source_session_id) || null) : null;

      const simTranscript = Array.isArray(sim.transcript)
        ? sim.transcript.map((m) => ({ role: m.role, text: scrubText(m.text) })) : [];

      // matched real Phase-C transcript (anonymized)
      let realTranscript = [];
      let realCareer = sim.persona?.career || null;
      if (sim.source_session_id) {
        const row = await getSessionRow(sim.source_session_id);
        if (row) {
          const study = anonymizeStudy(reconstructStudy(row), label);
          realTranscript = (study.phaseC?.transcript || []).map((m) => ({ role: m.role, text: m.text }));
          realCareer = study.phaseB?.career || realCareer;
        }
      }
      // persona summary without name (persona has none, but be safe)
      const persona = { ...(sim.persona || {}) };
      delete persona.name;

      res.json({
        id: sim.id, status: sim.status, created_at: sim.created_at,
        source_label: label || '—', career: realCareer,
        config: sim.config, persona,
        sim_transcript: simTranscript, real_transcript: realTranscript,
        error: sim.error,
      });
    } catch (err) {
      console.error('results/simulations/:id failed:', err?.message || err);
      res.status(500).json({ error: 'Load failed.' });
    }
  });
}
