/* Headless DOM smoke test: load the whole no-build bundle into jsdom, stub fetch,
 * and drive the entire study flow. Catches cross-file global resolution and render
 * errors that a Babel compile cannot. Run: node test/flow_test.cjs */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const FILES = ['tweaks-panel.jsx', 'graphics.jsx', 'screens.jsx', 'survey.jsx', 'chat.jsx', 'phaseb.jsx', 'app.jsx'];

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/?condition=main' });
const { window } = dom;

global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.IS_REACT_ACT_ENVIRONMENT = false;
window.IS_REACT_ACT_ENVIRONMENT = false;

window.React = require('react');
window.ReactDOM = require('react-dom'); // react-dom 18 exposes createRoot natively

// --- stubs ---
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.scrollTo = () => {};
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
let fetchCalls = [];
let patchBodies = [];
window.fetch = async (url, opts) => {
  fetchCalls.push(url);
  const method = (opts && opts.method) || 'GET';
  const body = opts && opts.body ? JSON.parse(opts.body) : {};
  let data = {};
  if (url.endsWith('/api/phase-b/session')) data = { sessionId: 'pb1', opening: 'Welcome! What in your studies genuinely pulls you in?' };
  else if (url.endsWith('/api/phase-c/session')) data = { sessionId: 'pc1', opening: "Hey — it's me, you in ten years.\n\nWhat's on your mind?" };
  else if (url.endsWith('/api/chat')) data = { reply: 'Here is a grounded reply.\n\nWhat else?', recommendations: [{ title: 'Data analyst', why: 'You like turning data into stories.', path: 'SQL plus an internship.' }, { title: 'Product manager', why: 'You organise people well.', path: 'APM programmes.' }] };
  else if (url.endsWith('/api/regenerate')) data = { reply: 'A rephrased reply.' };
  else if (url.endsWith('/api/sessions') && method === 'POST') data = { id: 'sess-test', condition: 'main', persisted: true };
  else if (/\/api\/sessions\//.test(url) && method === 'PATCH') { patchBodies.push(body); data = { ok: true, status: 'in_progress', persisted: true }; }
  return { ok: true, status: 200, json: async () => data };
};

const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const $ = (sel, ctx = window.document) => [...ctx.querySelectorAll(sel)];
const click = (el) => el && el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const byText = (text, sel = 'button') => $(sel).find((b) => b.textContent.replace(/\s+/g, ' ').trim().includes(text));
function setInput(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}
function eyebrowText() {
  const e = window.document.querySelector('.eyebrow, .sv-eyebrow, .consent-title');
  return e ? e.textContent.trim() : '(none)';
}
function autofillCurrent() {
  // number inputs
  $('input[type=number]').forEach((i) => setInput(i, '21'));
  // single-choice groups: pick first option in each group lacking a selection
  $('.sv-choices').forEach((g) => { if (!g.querySelector('.sv-choice.on')) click(g.querySelector('.sv-choice')); });
  // multi-select: pick first 3
  $('.sv-multi').forEach((g) => g.querySelectorAll('.sv-choice').forEach((c, i) => { if (i < 3) click(c); }));
  // scale rows: pick the last point
  $('.sv-scale').forEach((s) => { const pts = s.querySelectorAll('.sv-pt'); if (pts.length) click(pts[pts.length - 1]); });
  // IOS rows: pick a middle option
  $('.sv-ios').forEach((s) => { const o = s.querySelectorAll('.sv-ios-opt'); if (o.length) click(o[3]); });
  // textareas
  $('textarea').forEach((t) => { if (!t.value && !t.disabled) setInput(t, 'a test answer'); });
}

const fail = (msg) => { console.error('✗ ' + msg); process.exitCode = 1; throw new Error(msg); };
const ok = (msg) => console.log('✓ ' + msg);

(async () => {
  // Load the bundle exactly in browser order, each as a separate script.
  for (const f of FILES) {
    const code = babel.transformFileSync(path.join(ROOT, f), { presets: [['@babel/preset-react']] }).code;
    window.eval(code);
  }
  await tick(60);

  // 1. Landing
  if (!/Talk to/i.test(window.document.body.textContent)) fail('Landing did not render');
  ok('Landing rendered');

  // 2. Begin -> Consent
  click(byText('Begin')); await tick();
  if (!/Informed consent/i.test(window.document.body.textContent)) fail('Consent did not render');
  ok('Consent rendered');
  click(window.document.querySelector('.consent-check input')); await tick();
  click(byText('I agree')); await tick();

  // 3. Avatar
  if (!byText('STEP 01', '.step-label')) fail('Avatar screen did not render');
  const nameInput = window.document.querySelector('.flow-body input');
  setInput(nameInput, 'Maya'); await tick();
  click(byText('Continue')); await tick();
  ok('Avatar set');

  // 4. Pre-survey (5 pages)
  for (let p = 0; p < 5; p++) {
    if (!window.document.querySelector('.sv-wrap')) fail(`Pre-survey page ${p + 1} missing`);
    autofillCurrent(); await tick();
    const btn = byText('Done') || byText('Continue');
    if (btn.disabled) fail(`Pre-survey page ${p + 1} did not validate (button disabled)`);
    click(btn); await tick();
  }
  ok('Pre-survey completed (5 pages)');

  // 4b. Pause A→B ("Take a breath") — advances only on Continue
  await tick();
  if (!byText('Continue')) fail('Pause A→B did not render');
  click(byText('Continue')); await tick(60);
  ok('Pause A→B advanced on Continue');

  // 5. Phase B
  await tick(60);
  if (!window.document.querySelector('.pb-wrap')) fail('Phase B did not render');
  const pbComposer = window.document.querySelector('.pb-composer textarea');
  setInput(pbComposer, 'I like turning messy data into clear stories.'); await tick();
  click(window.document.querySelector('.pb-composer .send')); await tick(80);
  // Recommendation cards render, and selecting one reveals the lock-in + fills the choice.
  const cards = $('.rec-card');
  if (!cards.length) fail('Phase B recommendation cards did not render');
  click(cards[0]); await tick();
  if (!window.document.querySelector('.pb-lock')) fail('Phase B lock panel did not appear after choosing a card');
  if (window.document.querySelector('.pb-lock .sv-input').value !== 'Data analyst') fail('Card click did not fill the career choice');
  $('.pb-lock .sv-scale').forEach((s) => { const pts = s.querySelectorAll('.sv-pt'); click(pts[pts.length - 1]); }); await tick();
  const stepBtn = byText('Step into this future');
  if (stepBtn.disabled) fail('Phase B lock button stayed disabled');
  click(stepBtn); await tick(80);
  ok('Phase B completed (card selected + career locked: Data analyst)');

  // 5b. Pause B→C ("Begin" starts the phase-c clock)
  if (!byText('Begin')) fail('Pause B→C did not render');
  click(byText('Begin')); await tick(80);
  ok('Pause B→C advanced on Begin');

  // 6. Phase C role-play
  if (!window.document.querySelector('.chat-app')) fail('Phase C chat did not render');
  if (!/in ten years|it's me/i.test(window.document.body.textContent)) fail('Phase C opener missing');
  ok('Phase C rendered with model opener');
  click(byText('Finish')); await tick();

  // 6b. Pause C→POST ("Thank you") — advances only on Continue
  if (!byText('Continue')) fail('Pause C→POST did not render');
  click(byText('Continue')); await tick();
  ok('Pause C→POST advanced on Continue');

  // 7. Post-survey (4 pages)
  for (let p = 0; p < 4; p++) {
    if (!window.document.querySelector('.sv-wrap')) fail(`Post-survey page ${p + 1} missing`);
    autofillCurrent(); await tick();
    const btn = byText('Done') || byText('Continue');
    if (btn.disabled) fail(`Post-survey page ${p + 1} did not validate`);
    click(btn); await tick();
  }
  ok('Post-survey completed (4 pages)');

  // 7b. Free continuation (optional, logged separately) — finish to reach Closure
  await tick();
  const doneBtn = byText("I'm done");
  if (!doneBtn) fail('Free continuation screen did not render');
  click(doneBtn); await tick();
  ok('Free continuation screen rendered + closed');

  // 8. Closure + data export
  if (!/Thank you/i.test(window.document.body.textContent)) fail('Closure did not render');
  ok('Closure rendered');
  const dl = byText('Download');
  if (!dl) fail('Download button missing');
  click(dl); await tick();
  ok('Data export clicked (no throw)');

  // Endpoint coverage
  const hit = (u) => fetchCalls.some((c) => c.endsWith(u));
  ['/api/phase-b/session', '/api/chat', '/api/phase-c/session'].forEach((u) => {
    if (!hit(u)) fail(`expected fetch to ${u}`);
  });
  ok('All expected endpoints were called: ' + [...new Set(fetchCalls.map((c) => c.replace(/^https?:\/\/[^/]+/, '')))].join(', '));

  // Persistence coverage (additive — must not change the flow above)
  if (!fetchCalls.some((c) => c.endsWith('/api/sessions'))) fail('expected POST /api/sessions (session create)');
  if (!patchBodies.some((b) => b.preSurvey)) fail('expected a PATCH carrying preSurvey');
  if (!patchBodies.some((b) => b.phaseB)) fail('expected a PATCH carrying phaseB');
  if (!patchBodies.some((b) => b.phaseC)) fail('expected a PATCH carrying phaseC');
  const finalize = patchBodies.find((b) => b.finalize === true);
  if (!finalize) fail('expected a finalize PATCH at closure');
  if (!finalize.postSurvey) fail('finalize PATCH missing postSurvey');
  ok('Persistence saves fired: create + preSurvey + phaseB + phaseC + finalize(postSurvey)');

  console.log('\nALL FLOW STEPS PASSED ✅');
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error('\nFLOW TEST ERROR:', e.message); process.exit(1); });
