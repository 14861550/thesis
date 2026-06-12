/*
 * lib/study_routes.js — participant-facing session lifecycle (persistence).
 * Additive: if the DB is disabled these endpoints no-op gracefully so the
 * original in-memory participant flow keeps working unchanged.
 */

import { dbEnabled } from './db.js';
import {
  createSession, getSessionRow, saveSession, reconstructStudy,
} from './sessions.js';

const SECTION_KEYS = ['profile', 'preSurvey', 'scores', 'phaseB', 'phaseC', 'postSurvey'];

export function mountStudyRoutes(app) {
  // Create a study session at the start of a run (or admin-created link).
  app.post('/api/sessions', async (req, res) => {
    if (!dbEnabled) return res.json({ id: null, persisted: false });
    try {
      const b = req.body || {};
      const q = req.query || {};
      const row = await createSession({
        condition: b.condition || q.condition,
        rec: b.rec || q.rec,
        study: b.study || q.study,
        pid: b.pid || q.pid,
      });
      res.json({ id: row.id, condition: row.condition, rec: row.rec, study: row.study, persisted: true });
    } catch (err) {
      console.error('POST /api/sessions failed:', err?.message || err);
      res.status(500).json({ error: 'Could not create session.' });
    }
  });

  // Resume / load a session as the canonical study object.
  app.get('/api/sessions/:id', async (req, res) => {
    if (!dbEnabled) return res.status(404).json({ error: 'Persistence disabled.' });
    try {
      const row = await getSessionRow(req.params.id);
      if (!row) return res.status(404).json({ error: 'Not found.' });
      res.json(reconstructStudy(row));
    } catch (err) {
      console.error('GET /api/sessions/:id failed:', err?.message || err);
      res.status(500).json({ error: 'Could not load session.' });
    }
  });

  // Incremental save: persist whatever sections the frontend has so far.
  app.patch('/api/sessions/:id', async (req, res) => {
    if (!dbEnabled) return res.json({ persisted: false });
    try {
      const b = req.body || {};
      const partial = {};
      for (const k of SECTION_KEYS) if (b[k] !== undefined) partial[k] = b[k];
      for (const k of ['version', 'condition', 'rec', 'study', 'pid', 'notes', 'status', 'freeContinuation']) {
        if (b[k] !== undefined) partial[k] = b[k];
      }
      if (b.finalize) partial.finalize = true;
      const row = await saveSession(req.params.id, partial);
      if (!row) return res.status(404).json({ error: 'Not found.' });
      res.json({ ok: true, status: row.status, persisted: true });
    } catch (err) {
      console.error('PATCH /api/sessions/:id failed:', err?.message || err);
      res.status(500).json({ error: 'Could not save session.' });
    }
  });
}
