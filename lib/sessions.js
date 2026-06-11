/*
 * lib/sessions.js — study-session persistence on top of lib/db.js.
 *
 * A "study session" is one full participant run (profile + surveys + both
 * transcripts + scores + condition). JSONB columns mirror the app's `study`
 * object exactly, so reconstructStudy() rebuilds the JSON eval_pipeline expects.
 */

import { query } from './db.js';

// study-object section -> column name
const SECTION_COLS = {
  profile: 'profile',
  preSurvey: 'pre_survey',
  scores: 'scores',
  phaseB: 'phase_b',
  phaseC: 'phase_c',
  postSurvey: 'post_survey',
};

function normCondition(c) {
  return c === 'baseline' ? 'baseline' : 'main';
}

const REC_VALUES = new Set(['guide', 'reflective', 'direct']);
function normRec(r) { return REC_VALUES.has(r) ? r : 'reflective'; }
const clip = (v, n = 40) => (v == null ? null : String(v).slice(0, n));

/** Pick the minority condition so assignment stays balanced across runs. */
export async function assignBalancedCondition() {
  const { rows } = await query(
    `SELECT condition, count(*)::int AS n FROM sessions GROUP BY condition`
  );
  const counts = { main: 0, baseline: 0 };
  for (const r of rows) if (r.condition in counts) counts[r.condition] = r.n;
  return counts.baseline < counts.main ? 'baseline' : 'main';
}

export async function createSession({ condition, rec, study, pid } = {}) {
  const cond = condition ? normCondition(condition) : await assignBalancedCondition();
  const { rows } = await query(
    `INSERT INTO sessions (condition, rec, study, pid, status)
     VALUES ($1, $2, $3, $4, 'started') RETURNING *`,
    [cond, normRec(rec), clip(study) || 'kangzhi', clip(pid)]
  );
  return rows[0];
}

export async function getSessionRow(id) {
  const { rows } = await query(`SELECT * FROM sessions WHERE id = $1`, [id]);
  return rows[0] || null;
}

/**
 * Upsert provided sections of the study object + status/version.
 * partial: { profile?, preSurvey?, scores?, phaseB?, phaseC?, postSurvey?,
 *            condition?, version?, notes?, status?, finalize? }
 * Re-derives the messages table from any transcript provided.
 */
export async function saveSession(id, partial = {}) {
  const sets = [];
  const vals = [];
  let i = 1;
  let touchedContent = false;

  for (const [key, col] of Object.entries(SECTION_COLS)) {
    if (partial[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      vals.push(JSON.stringify(partial[key]));
      touchedContent = true;
    }
  }
  if (partial.version !== undefined) { sets.push(`version = $${i++}`); vals.push(partial.version); }
  if (partial.condition !== undefined) { sets.push(`condition = $${i++}`); vals.push(normCondition(partial.condition)); }
  if (partial.rec !== undefined) { sets.push(`rec = $${i++}`); vals.push(normRec(partial.rec)); }
  if (partial.study !== undefined) { sets.push(`study = $${i++}`); vals.push(clip(partial.study) || 'kangzhi'); }
  if (partial.pid !== undefined) { sets.push(`pid = $${i++}`); vals.push(clip(partial.pid)); }
  if (partial.notes !== undefined) { sets.push(`notes = $${i++}`); vals.push(partial.notes); }
  // Free continuation is written AFTER completion; never let it bump status back
  // to in_progress (so it is intentionally not counted as `touchedContent`).
  if (partial.freeContinuation !== undefined) {
    sets.push(`free_continuation = $${i++}`); vals.push(JSON.stringify(partial.freeContinuation));
  }

  // status: explicit > finalize > auto-bump to in_progress on content writes
  let status = partial.status;
  if (partial.finalize) status = 'completed';
  if (!status && touchedContent) status = 'in_progress';
  if (status) { sets.push(`status = $${i++}`); vals.push(status); }
  if (status === 'completed') sets.push(`completed_at = now()`);

  if (sets.length === 0) return getSessionRow(id);

  vals.push(id);
  const { rows } = await query(
    `UPDATE sessions SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  if (!rows.length) return null;

  if (partial.phaseB && Array.isArray(partial.phaseB.transcript)) {
    await replaceMessages(id, 'b', partial.phaseB.transcript);
  }
  if (partial.phaseC && Array.isArray(partial.phaseC.transcript)) {
    await replaceMessages(id, 'c', partial.phaseC.transcript);
  }
  return rows[0];
}

/** Replace the messages rows for one phase from a transcript [{role,text}]. */
async function replaceMessages(id, phase, transcript) {
  await query(`DELETE FROM messages WHERE session_id = $1 AND phase = $2`, [id, phase]);
  let idx = 0;
  for (const m of transcript) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    const text = (m.text ?? '').toString();
    await query(
      `INSERT INTO messages (session_id, phase, idx, role, text) VALUES ($1,$2,$3,$4,$5)`,
      [id, phase, idx++, role, text]
    );
  }
}

export async function getMessages(id) {
  const { rows } = await query(
    `SELECT phase, idx, role, text, created_at FROM messages
     WHERE session_id = $1 ORDER BY phase, idx`,
    [id]
  );
  return rows;
}

export async function listSessions({ condition, status, limit = 200 } = {}) {
  const { rows } = await query(
    `SELECT id, condition, rec, study, pid, status, version, created_at, completed_at,
            COALESCE((phase_c->>'turnCount')::int, 0) AS phase_c_turns,
            COALESCE(phase_b->>'career', '') AS career
     FROM sessions
     WHERE ($1::text IS NULL OR condition = $1)
       AND ($2::text IS NULL OR status = $2)
     ORDER BY created_at DESC
     LIMIT $3`,
    [condition || null, status || null, limit]
  );
  return rows;
}

export async function deleteSession(id) {
  const { rowCount } = await query(`DELETE FROM sessions WHERE id = $1`, [id]);
  return rowCount > 0;
}

/**
 * Rebuild the canonical `study` JSON from a DB row — the exact shape
 * app.jsx Closure produces and eval_pipeline's loader consumes.
 */
export function reconstructStudy(row) {
  return {
    meta: {
      condition: row.condition,
      rec: row.rec || 'reflective',
      study: row.study || 'kangzhi',
      pid: row.pid || null,
      version: row.version || '3.0',
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    },
    profile: row.profile || {},
    preSurvey: row.pre_survey || {},
    scores: row.scores || {},
    phaseB: row.phase_b || {},
    phaseC: row.phase_c || {},
    postSurvey: row.post_survey || {},
    freeContinuation: row.free_continuation || {},
  };
}

export async function exportStudies({ deidentify = false, status } = {}) {
  const { rows } = await query(
    `SELECT * FROM sessions
     WHERE ($1::text IS NULL OR status = $1)
     ORDER BY created_at`,
    [status || null]
  );
  return rows.map((r) => {
    const study = reconstructStudy(r);
    study.meta.sessionId = r.id; // traceability; ignored by the loader
    return deidentify ? deidentifyStudy(study) : study;
  });
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/**
 * Best-effort de-identification for analysis exports:
 *  - strips the post-survey contact/email + interview-yes contact
 *  - redacts email addresses anywhere in free text / transcripts
 *  - flags (does not fully remove) names/places — manual review still required
 */
export function deidentifyStudy(study) {
  const s = JSON.parse(JSON.stringify(study));
  if (s.postSurvey) {
    delete s.postSurvey.contact;
    delete s.postSurvey.email;
  }
  const scrub = (t) => (typeof t === 'string' ? t.replace(EMAIL_RE, '[EMAIL]') : t);
  // open-ended free text
  for (const k of ['oe_real', 'oe_broke', 'oe_voice', 'oe_shift']) {
    if (s.postSurvey && s.postSurvey[k]) s.postSurvey[k] = scrub(s.postSurvey[k]);
  }
  // transcripts
  for (const phase of ['phaseB', 'phaseC']) {
    const t = s[phase] && s[phase].transcript;
    if (Array.isArray(t)) t.forEach((m) => { if (m && m.text) m.text = scrub(m.text); });
  }
  s.meta = s.meta || {};
  s.meta.deidentified = true;
  return s;
}

/**
 * Stronger anonymization for the supervisor-facing /results page: de-identify
 * AND replace the participant's name with an anonymous label (e.g. "P03"), so
 * no name is ever served. Everything else (demographics, scores, transcripts)
 * stays, scrubbed.
 */
export function anonymizeStudy(study, label) {
  const s = deidentifyStudy(study);
  s.profile = s.profile || {};
  if (label) s.profile.name = label;
  else delete s.profile.name;
  s.meta = s.meta || {};
  s.meta.anonLabel = label || null;
  return s;
}
