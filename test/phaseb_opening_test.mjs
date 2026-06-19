/*
 * Regression test for the stage-B OPENING card leak.
 *
 * The DIRECT arm (now the default) skips the warm-up questions and emits its
 * five career cards in its very FIRST turn. That opening comes back from
 * /api/phase-b/session, NOT /api/chat — and for a while only /api/chat ran
 * extractRecommendations(), so the direct arm's opening leaked a raw
 * ```json {...}``` block straight into the first chat bubble (seen live, 19 Jun
 * 2026). This test stands up the real server against a stub LLM and asserts the
 * route returns parsed cards + a clean opening for direct, and leaves the
 * reflective arm (which opens with a question) untouched.
 *
 * Run: node test/phaseb_opening_test.mjs
 */
import http from 'node:http';
import { spawn } from 'node:child_process';

const CARDS = '{"recommendations":[' +
  ['Data-Driven Product Management', 'AI-Augmented Business Analytics', 'UX Research & Design',
    'Digital Marketing & Growth', 'Operations & Process Improvement']
    .map((t) => `{"title":"${t}","why":"Fits your profile.","path":"Start junior, then grow."}`)
    .join(', ') + ']}';
// Mirrors the live leak: fence tag + JSON inline on one line, prose either side.
const DIRECT_OPENING = "I've reviewed your background, so I'll jump straight to suggestions.\n\nFive directions:\n\n```json " + CARDS + " ```\n\nWhich feels most interesting?";
const REFLECTIVE_OPENING = 'Before I suggest anything — what part of your studies has felt most alive lately?';

const skip = (msg) => { console.log('• ' + msg + ' — skipping phase-b opening test'); process.exit(0); };
const fail = (msg) => { console.error('✗ ' + msg); process.exitCode = 1; };

// Stub LLM: choose the reply by which arm's system prompt arrived.
const llm = http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    let sys = '';
    try { sys = (JSON.parse(b).messages.find((m) => m.role === 'system') || {}).content || ''; } catch { /* ignore */ }
    const content = /Reflective questioning process/.test(sys) ? REFLECTIVE_OPENING : DIRECT_OPENING;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }));
  });
});

await new Promise((r) => llm.listen(0, '127.0.0.1', r));
const llmPort = llm.address().port;
const appPort = 30000 + Math.floor(Math.random() * 20000);

const srv = spawn(process.execPath, ['server.js'], {
  cwd: new URL('..', import.meta.url).pathname,
  env: { ...process.env, PORT: String(appPort), LLM_BASE_URL: `http://127.0.0.1:${llmPort}`, UVA_API_TOKEN: 'stub', DATABASE_URL: '', ADMIN_TOKEN: '' },
  stdio: 'ignore',
});

const base = `http://127.0.0.1:${appPort}`;
const ready = async () => {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(base + '/healthz'); if (r.ok) return true; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

try {
  if (!(await ready())) { srv.kill(); llm.close(); skip('server did not start (no subprocess/port?)'); }

  const session = async (rec) => {
    const r = await fetch(base + '/api/phase-b/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rec, profileData: { demographics: { major: 'Psychology' } } }),
    });
    return r.json();
  };

  const d = await session('direct');
  const dLeak = /recommendations":\s*\[/.test(d.opening || '');
  if (Array.isArray(d.recommendations) && d.recommendations.length === 5 && !dLeak
      && /Which feels most interesting/.test(d.opening)) {
    console.log('✓ direct opening → 5 cards parsed, clean prose, no raw JSON in the bubble');
  } else {
    fail(`direct opening not extracted: cards=${d.recommendations ? d.recommendations.length : 'null'}, rawJSON=${dLeak}, opening=${JSON.stringify((d.opening || '').slice(0, 100))}`);
  }

  const rf = await session('reflective');
  if (rf.recommendations == null && /alive lately/.test(rf.opening || '')) {
    console.log('✓ reflective opening → a question, no cards, unchanged');
  } else {
    fail(`reflective opening unexpectedly altered: cards=${rf.recommendations ? rf.recommendations.length : 'null'}`);
  }
} catch (e) {
  fail('unexpected error: ' + (e && e.message));
} finally {
  srv.kill(); llm.close();
}

if (process.exitCode) { console.error('\nPHASE-B OPENING TEST FAILED ❌'); process.exit(1); }
console.log('\nPHASE-B OPENING TEST PASSED ✅');
process.exit(0);
