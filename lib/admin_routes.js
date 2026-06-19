/*
 * lib/admin_routes.js — gated management dashboard + admin API.
 *
 * Auth is a single shared secret (ADMIN_TOKEN), accepted as a Bearer header,
 * an httpOnly `admin_token` cookie (set by /admin/login), or ?token=. This is
 * deliberately minimal (no user accounts) — flagged as such in the README.
 * If ADMIN_TOKEN is unset the whole admin surface is disabled (503).
 */

import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { dbEnabled, describeDbError, dbHint } from './db.js';
import {
  listSessions, getSessionRow, getMessages, deleteSession,
  createSession, reconstructStudy, exportStudies,
} from './sessions.js';
import { createRun, listRuns, getRun } from './eval_runner.js';
import { createSimulation, listSimulations, getSimulation } from './simulator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_DIR = path.join(__dirname, '..', 'admin');

const adminConfigured = () => Boolean(process.env.ADMIN_TOKEN);

// Constant-time compare of a provided token against ADMIN_TOKEN — avoids a
// timing side-channel on the gate that protects all participant PII. Returns
// false (never throws) for empty/length-mismatched input.
function tokenMatches(provided) {
  const a = Buffer.from(String(provided ?? ''));
  const b = Buffer.from(String(process.env.ADMIN_TOKEN ?? ''));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

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
  const c = parseCookies(req).admin_token;
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

function requireAdmin(req, res, next) {
  if (!adminConfigured()) return res.status(503).json({ error: 'Admin disabled: set ADMIN_TOKEN.' });
  if (!tokenMatches(tokenFromReq(req))) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}

function requireDb(req, res, next) {
  if (!dbEnabled) return res.status(503).json({ error: 'Persistence disabled: set DATABASE_URL.' });
  next();
}

export function mountAdminRoutes(app) {
  // --- Admin UI (gated): valid token → dashboard, else → login page ---------
  app.get(['/admin', '/admin/'], (req, res) => {
    if (!adminConfigured()) return res.status(503).send('Admin disabled — set ADMIN_TOKEN in the server env.');
    const ok = tokenMatches(tokenFromReq(req));
    // A valid ?token= link must also authenticate the dashboard's own API
    // calls: persist it as the cookie, otherwise the first XHR gets a 401 and
    // bounces the user straight back to the login screen.
    if (ok && req.query && req.query.token) {
      res.setHeader('Set-Cookie', cookieStr('admin_token', String(req.query.token), req));
    }
    res.sendFile(path.join(ADMIN_DIR, ok ? 'index.html' : 'login.html'));
  });

  // The dashboard's React code, precompiled (npm run build) and served GATED —
  // same posture as index.html, so it never reaches an unauthenticated client.
  // The authenticated page requests it with the admin_token cookie attached.
  app.get('/admin/admin.js', requireAdmin, (req, res) => {
    res.type('application/javascript').sendFile(path.join(ADMIN_DIR, 'admin.js'));
  });

  app.post('/admin/login', (req, res) => {
    if (!adminConfigured()) return res.status(503).json({ error: 'Admin disabled.' });
    const token = (req.body && req.body.token) || '';
    if (!tokenMatches(token)) return res.status(401).json({ error: 'Invalid token.' });
    res.setHeader('Set-Cookie', cookieStr('admin_token', token, req));
    res.json({ ok: true });
  });

  app.post('/admin/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'admin_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    res.json({ ok: true });
  });

  // --- Sessions admin API ---------------------------------------------------
  app.get('/api/admin/sessions/export', requireAdmin, requireDb, async (req, res) => {
    try {
      const deidentify = req.query.deidentify === '1' || req.query.deidentify === 'true';
      const studies = await exportStudies({ deidentify });
      res.setHeader('Content-Disposition', `attachment; filename="sessions${deidentify ? '_deidentified' : ''}.json"`);
      res.json(studies);
    } catch (err) {
      console.error('export failed:', describeDbError(err));
      res.status(500).json({ error: 'Export failed.', detail: describeDbError(err), hint: dbHint() || undefined });
    }
  });

  app.get('/api/admin/sessions', requireAdmin, requireDb, async (req, res) => {
    try {
      const rows = await listSessions({
        condition: req.query.condition, status: req.query.status,
        limit: Math.min(parseInt(req.query.limit, 10) || 200, 1000),
      });
      res.json(rows);
    } catch (err) {
      console.error('list sessions failed:', describeDbError(err));
      // Gated, researcher-only endpoint — surface the real cause so a
      // misconfigured DB is diagnosable instead of an opaque "List failed".
      res.status(500).json({ error: 'List failed.', detail: describeDbError(err), hint: dbHint() || undefined });
    }
  });

  app.post('/api/admin/sessions', requireAdmin, requireDb, async (req, res) => {
    try {
      const b = req.body || {};
      const row = await createSession({ condition: b.condition, rec: b.rec, study: b.study, pid: b.pid });
      const params = new URLSearchParams({ session: row.id, cond: row.condition, rec: row.rec, study: row.study });
      if (b.pid) params.set('pid', b.pid);
      const link = `/?${params.toString()}`;
      res.json({ id: row.id, condition: row.condition, rec: row.rec, study: row.study, link });
    } catch (err) {
      console.error('create session failed:', err?.message || err);
      res.status(500).json({ error: 'Create failed.' });
    }
  });

  app.get('/api/admin/sessions/:id', requireAdmin, requireDb, async (req, res) => {
    try {
      const row = await getSessionRow(req.params.id);
      if (!row) return res.status(404).json({ error: 'Not found.' });
      const messages = await getMessages(req.params.id);
      res.json({
        id: row.id, condition: row.condition, status: row.status, version: row.version,
        created_at: row.created_at, completed_at: row.completed_at, notes: row.notes,
        study: reconstructStudy(row), messages,
      });
    } catch (err) {
      console.error('get session failed:', describeDbError(err));
      res.status(500).json({ error: 'Load failed.', detail: describeDbError(err) });
    }
  });

  app.delete('/api/admin/sessions/:id', requireAdmin, requireDb, async (req, res) => {
    try {
      const ok = await deleteSession(req.params.id);
      res.json({ ok });
    } catch (err) {
      console.error('delete session failed:', err?.message || err);
      res.status(500).json({ error: 'Delete failed.' });
    }
  });

  // --- Eval-run management API ----------------------------------------------
  app.post('/api/admin/eval-runs', requireAdmin, requireDb, async (req, res) => {
    try {
      const run = await createRun(req.body || {});
      res.json({ id: run.id, status: run.status, config: run.config });
    } catch (err) {
      console.error('create eval-run failed:', err?.message || err);
      res.status(500).json({ error: 'Could not launch run.' });
    }
  });

  app.get('/api/admin/eval-runs', requireAdmin, requireDb, async (req, res) => {
    try { res.json(await listRuns()); }
    catch (err) { res.status(500).json({ error: 'List failed.', detail: describeDbError(err), hint: dbHint() || undefined }); }
  });

  app.get('/api/admin/eval-runs/:id', requireAdmin, requireDb, async (req, res) => {
    try {
      const run = await getRun(req.params.id);
      if (!run) return res.status(404).json({ error: 'Not found.' });
      const { report_html, ...rest } = run;
      res.json({ ...rest, has_report: Boolean(report_html) });
    } catch (err) {
      res.status(500).json({ error: 'Load failed.' });
    }
  });

  app.get('/api/admin/eval-runs/:id/report', requireAdmin, requireDb, async (req, res) => {
    try {
      const run = await getRun(req.params.id);
      if (!run || !run.report_html) return res.status(404).send('No report.');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(run.report_html);
    } catch (err) {
      res.status(500).send('Report error.');
    }
  });

  // --- Simulation management API (silicon-participant bot↔bot runs) ----------
  app.post('/api/admin/simulations', requireAdmin, requireDb, async (req, res) => {
    try {
      const sim = await createSimulation(req.body || {});
      res.json({ id: sim.id, status: sim.status });
    } catch (err) {
      console.error('create simulation failed:', err?.message || err);
      res.status(400).json({ error: err?.message || 'Could not launch simulation.' });
    }
  });

  app.get('/api/admin/simulations', requireAdmin, requireDb, async (req, res) => {
    try { res.json(await listSimulations()); }
    catch (err) { res.status(500).json({ error: 'List failed.', detail: describeDbError(err), hint: dbHint() || undefined }); }
  });

  app.get('/api/admin/simulations/:id', requireAdmin, requireDb, async (req, res) => {
    try {
      const sim = await getSimulation(req.params.id);
      if (!sim) return res.status(404).json({ error: 'Not found.' });
      res.json(sim);
    } catch (err) {
      res.status(500).json({ error: 'Load failed.' });
    }
  });
}
