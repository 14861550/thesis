/*
 * Pure unit test (no DB): reconstructStudy() rebuilds the exact `study` shape
 * eval_pipeline's loader expects, and deidentifyStudy() removes PII.
 */
import assert from 'node:assert';
import { reconstructStudy, deidentifyStudy } from '../lib/sessions.js';
import { closePool } from '../lib/db.js';

const row = {
  id: 'abc-123', condition: 'main', status: 'completed', version: '3.0',
  completed_at: new Date('2026-06-03T00:00:00Z'),
  profile: { name: 'Maya' },
  pre_survey: { fscs_similar: 4, viv_clear: 3 },
  scores: { bigFive: { O: 4 }, riasec: { I: 5 }, values: ['Achievement'] },
  phase_b: { career: 'Data analyst', transcript: [{ role: 'user', text: 'hi maya@x.com' }] },
  phase_c: { turnCount: 2, transcript: [{ role: 'future', text: 'reach me at a@b.co' }] },
  post_survey: { fscs_similar_post: 5, oe_real: 'email me x@y.com', contact: 'secret@example.com', interview: 'Yes' },
  // post-study free chat + a career exploration, both recorded and exported —
  // emails typed here must be redacted just like the main-phase transcripts.
  free_continuation: {
    transcript: [{ role: 'user', text: 'ping me free@cont.com' }],
    explorations: [{
      career: 'Nurse',
      phaseBTranscript: [{ role: 'user', text: 'reach pb@exp.com' }],
      transcript: [{ role: 'user', text: 'or exp@chat.com' }],
    }],
  },
};

const study = reconstructStudy(row);
const TOP = ['meta', 'profile', 'preSurvey', 'scores', 'phaseB', 'phaseC', 'postSurvey'];
for (const k of TOP) assert.ok(k in study, `study missing top-level "${k}"`);
for (const k of ['condition', 'version', 'completedAt']) assert.ok(k in study.meta, `meta missing "${k}"`);
assert.equal(study.preSurvey.fscs_similar, 4, 'pre_survey -> preSurvey mapping');
assert.equal(study.phaseB.career, 'Data analyst', 'phase_b -> phaseB mapping');
assert.equal(study.postSurvey.fscs_similar_post, 5, 'post_survey -> postSurvey mapping');
console.log('✓ reconstructStudy produces loader-compatible shape');

const deid = deidentifyStudy(study);
assert.ok(!('contact' in deid.postSurvey), 'contact must be stripped');
assert.ok(!/@/.test(deid.postSurvey.oe_real), 'emails redacted in open-ended');
assert.ok(!/@/.test(deid.phaseC.transcript[0].text), 'emails redacted in transcript');
// free continuation + explorations are exported too, so they must be scrubbed
assert.ok(!/@/.test(deid.freeContinuation.transcript[0].text), 'emails redacted in free-continuation chat');
assert.ok(!/@/.test(deid.freeContinuation.explorations[0].transcript[0].text), 'emails redacted in exploration chat');
assert.ok(!/@/.test(deid.freeContinuation.explorations[0].phaseBTranscript[0].text), 'emails redacted in exploration phase-B chat');
assert.equal(deid.meta.deidentified, true, 'deid flag set');
// original study must be untouched (deep copy)
assert.equal(study.postSurvey.contact, 'secret@example.com', 'original not mutated');
console.log('✓ deidentifyStudy strips contact + redacts emails (non-mutating)');

await closePool();
console.log('\nRECONSTRUCT TESTS PASSED ✅');
