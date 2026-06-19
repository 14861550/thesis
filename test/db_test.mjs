/*
 * DB integration test: full session roundtrip (create → save → finalize →
 * fetch → messages → list → de-id export → delete). Skips cleanly if no DB.
 */
import assert from 'node:assert';
import { dbEnabled, initSchema, closePool } from '../lib/db.js';
import {
  createSession, saveSession, getSessionRow, getMessages,
  listSessions, deleteSession, reconstructStudy, exportStudies,
} from '../lib/sessions.js';

if (!dbEnabled) {
  console.log('• DATABASE_URL not set — skipping DB integration test');
  process.exit(0);
}

await initSchema();

const created = await createSession({ condition: 'main', recruiter: 'Gleb' });
assert.ok(created.id, 'createSession returns id');
assert.equal(created.recruiter, 'Gleb', 'createSession stores recruiter');
const id = created.id;

await saveSession(id, {
  profile: { name: 'TestUser' },
  preSurvey: { fscs_similar: 4, fscs_connected: 4, fscs_care: 5, viv_clear: 3, viv_tangible: 3, viv_detail: 4, viv_felt: 4 },
  scores: { bigFive: { O: 4 }, riasec: { I: 5 }, values: ['Achievement'] },
});
await saveSession(id, { phaseB: { career: 'Data analyst', transcript: [{ role: 'guide', text: 'hi' }, { role: 'user', text: 'hello' }] } });
await saveSession(id, { phaseC: { turnCount: 1, durationSec: 120, transcript: [{ role: 'future', text: 'future me' }, { role: 'user', text: 'q?' }] } });
const finalRow = await saveSession(id, {
  postSurvey: { fscs_similar_post: 5, fscs_connected_post: 5, fscs_care_post: 6, viv_clear_post: 5, viv_tangible_post: 5, viv_detail_post: 6, viv_felt_post: 5, mc_style: 6, mc_scene: 5, mc_understand: 6, contact: 'me@example.com' },
  version: '3.0', finalize: true,
});
assert.equal(finalRow.status, 'completed', 'finalize → completed');
assert.ok(finalRow.completed_at, 'completed_at set');
console.log('✓ create → save sections → finalize');

const row = await getSessionRow(id);
const study = reconstructStudy(row);
assert.equal(study.phaseB.career, 'Data analyst', 'career persisted');
assert.equal(study.postSurvey.fscs_care_post, 6, 'post value persisted');
assert.equal(study.meta.recruiter, 'Gleb', 'recruiter in reconstructed meta');

const msgs = await getMessages(id);
const bCount = msgs.filter((m) => m.phase === 'b').length;
const cCount = msgs.filter((m) => m.phase === 'c').length;
assert.equal(bCount, 2, 'phase-b messages derived');
assert.equal(cCount, 2, 'phase-c messages derived');
console.log(`✓ fetch + ${bCount} phase-b / ${cCount} phase-c messages derived`);

const listed = await listSessions({ status: 'completed' });
assert.ok(listed.some((r) => r.id === id), 'appears in completed list');
assert.equal(listed.find((r) => r.id === id).recruiter, 'Gleb', 'listSessions returns recruiter');
assert.ok((await listSessions({ recruiter: 'Gleb' })).some((r) => r.id === id), 'recruiter filter includes the session');
assert.ok((await listSessions({ recruiter: 'Nobody' })).every((r) => r.id !== id), 'recruiter filter excludes non-matches');

const exp = await exportStudies({ deidentify: true, status: 'completed' });
const mine = exp.find((s) => s.meta.sessionId === id);
assert.ok(mine && !('contact' in mine.postSurvey), 'de-identified export strips contact');
console.log('✓ list + de-identified export');

assert.equal(await deleteSession(id), true, 'delete returns true');
assert.equal(await getSessionRow(id), null, 'row gone after delete');
assert.equal((await getMessages(id)).length, 0, 'messages cascade-deleted');
console.log('✓ delete cascades to messages');

await closePool();
console.log('\nDB INTEGRATION TESTS PASSED ✅');
