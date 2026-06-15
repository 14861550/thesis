/* Full participant-flow walkthrough with a mocked backend — screenshots every
 * screen for visual QA. Run: node test/ui_walk.mjs   (server must be on :3457) */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3457';
const OUT = '/tmp/ui';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const json = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.endsWith('/api/phase-b/session')) {
      return json({ sessionId: 'pb1', opening: 'Welcome! What parts of your studies genuinely pull you in?' });
    }
    if (url.endsWith('/api/phase-c/session')) {
      return json({ sessionId: 'pc1', opening: "Hey — it's me. You, about ten years out, working as a data analyst in Amsterdam.\n\nSome days are genuinely good and some are just long. What do you want to know first?" });
    }
    if (url.endsWith('/api/chat')) {
      return json({
        reply: "Honestly? Last Tuesday I was at my desk by nine, coffee going cold, untangling a dashboard nobody trusted. By four I'd found the bug and Sofie high-fived me across the aisle.\n\nThe ordinary days are most of it — and I've grown to like that. What else are you wondering about?",
        recommendations: [
          { title: 'Data analyst', why: 'You like turning messy data into clear stories.', path: 'SQL + an internship.' },
          { title: 'Product manager', why: 'You organise people well.', path: 'APM programmes.' },
          { title: 'Policy economist', why: 'You care about impact.', path: 'MSc + traineeship.' },
          { title: 'UX researcher', why: 'You ask sharp questions.', path: 'Research methods + portfolio.' },
          { title: 'Startup founder', why: 'You like owning problems.', path: 'Join one first.' },
        ],
      });
    }
    if (url.includes('/api/sessions')) {
      return json(method === 'POST' ? { id: 'sess-ui', condition: 'main', persisted: true } : { ok: true, persisted: true });
    }
    return json({ ok: true });
  });
}

// Dispatch real DOM events (React 18 handles native events at the root).
const helpers = `
  window.$$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  window.clickEl = (el) => el && el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  window.byText = (text, sel = 'button') => $$(sel).find((b) => b.textContent.replace(/\\s+/g, ' ').trim().includes(text));
  window.setVal = (el, value) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  window.autofill = () => {
    $$('input[type=number]').forEach((i) => setVal(i, '21'));
    $$('.sv-choices').forEach((g) => { if (!g.querySelector('.sv-choice.on')) clickEl(g.querySelector('.sv-choice')); });
    $$('.sv-multi').forEach((g) => g.querySelectorAll('.sv-choice').forEach((c, i) => { if (i < 3) clickEl(c); }));
    $$('.sv-scale').forEach((s) => { const p = s.querySelectorAll('.sv-pt'); if (p.length) clickEl(p[p.length - 2]); });
    $$('.sv-ios').forEach((s) => { const o = s.querySelectorAll('.sv-ios-opt'); if (o.length) clickEl(o[3]); });
    $$('textarea').forEach((t) => { if (!t.value && !t.disabled) setVal(t, 'a short honest test answer'); });
  };
`;

async function walk(viewport, tag) {
  const page = await browser.newPage({ viewport, ignoreHTTPSErrors: true });
  page.on('pageerror', (e) => console.error('[pageerror]', viewport.width, e.message));
  await mockApi(page);
  await page.goto(BASE + '/?cond=main&rec=guide', { waitUntil: 'networkidle' });
  await page.addScriptTag({ content: helpers });
  const shot = (n) => page.screenshot({ path: `${OUT}/${tag}_${n}.png`, fullPage: false });
  const run = (code) => page.evaluate(code);
  const t = (ms = 250) => page.waitForTimeout(ms);

  await t(1200); await shot('01_landing');
  await run(`clickEl(byText('Begin'))`); await t(); await shot('02_consent');
  await run(`clickEl(document.querySelector('.consent-check input'))`); await t();
  await run(`clickEl(byText('I agree'))`); await t(); await shot('03_avatar');
  await run(`setVal(document.querySelector('.flow-body input'), 'Maya')`); await t();
  await run(`clickEl(byText('Continue'))`); await t(400);
  // pre-survey, short pages; loop until the progress bar disappears
  for (let p = 0; p < 15; p++) {
    await t(250);
    if (!(await page.evaluate(`!!document.querySelector('.flow-progress')`))) break;
    if (p === 0) await shot('04_presurvey_p1');
    if (p === 3) await shot('04b_presurvey_mid');
    const hasCircles = await page.evaluate(`!!document.querySelector('.sv-ios')`);
    if (hasCircles) await shot(`05_presurvey_circles_p${p + 1}`);
    await run(`autofill()`); await t(250);
    await run(`clickEl(byText('Done') || byText('Continue'))`);
  }
  await t(400); await shot('06_pause_ab');
  await run(`clickEl(byText('Continue'))`); await t(800); await shot('07_phaseb');
  await run(`setVal(document.querySelector('.pb-composer textarea'), 'I like untangling messy data into clear stories.')`); await t();
  await run(`clickEl(document.querySelector('.pb-composer .send'))`); await t(900); await shot('08_phaseb_cards');
  await run(`clickEl($$('.rec-card')[0])`); await t(300); await shot('09_phaseb_lock');
  await run(`$$('.pb-lock .sv-scale').forEach((s) => { const p = s.querySelectorAll('.sv-pt'); clickEl(p[p.length - 1]); })`); await t();
  await run(`clickEl(byText('Step into this future'))`); await t(500); await shot('10_pause_bc');
  await run(`clickEl(byText('Begin'))`); await t(1000); await shot('11_chat_opener');
  await run(`setVal(document.querySelector('.composer textarea'), 'what does a normal tuesday look like?')`); await t();
  await run(`clickEl(document.querySelector('.composer .send'))`); await t(1000); await shot('12_chat_reply_chips');
  await run(`clickEl(byText('Finish'))`); await t(400); await shot('13_pause_cpost');
  await run(`clickEl(byText('Continue'))`); await t(400);
  for (let p = 0; p < 12; p++) {
    await t(250);
    if (!(await page.evaluate(`!!document.querySelector('.flow-progress')`))) break;
    if (p === 0) await shot('14_postsurvey_p1');
    await run(`autofill()`); await t(250);
    await run(`clickEl(byText('Done') || byText('Continue'))`);
  }
  await t(500); await shot('14b_explore_hub');
  await run(`clickEl(byText('Keep talking'))`); await t(600); await shot('15_free_continuation');
  await run(`setVal(document.querySelector('.composer textarea'), 'one more thing — do you still see your uni friends?')`); await t();
  await run(`clickEl(document.querySelector('.composer .send'))`); await t(900); await shot('16_free_reply');
  await run(`clickEl(byText("I'm done"))`); await t(400);
  await run(`clickEl(byText('finish up'))`); await t(400); await shot('17_closure');
  await page.close();
}

await walk({ width: 1440, height: 900 }, 'desk');
await walk({ width: 390, height: 844 }, 'mob');
await browser.close();
console.log('UI walk complete:', fs.readdirSync(OUT).length, 'screenshots');
