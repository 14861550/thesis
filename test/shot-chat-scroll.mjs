/* Verify the role-play opens at the TOP of a long opening message (Andrea
 * feedback: it used to jump to the bottom), then follows the newest turn once
 * the participant has sent something. API mocked with a deliberately long
 * opening so the thread overflows. Dev-only. */
import { chromium } from 'playwright';
import http from 'http'; import { readFileSync, existsSync, mkdirSync } from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(ROOT, 'shots'), { recursive: true });
const MIME={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!existsSync(fp)){s.writeHead(404);return s.end('nf');}s.writeHead(200,{'content-type':MIME[path.extname(fp)]||'text/plain'});s.end(readFileSync(fp));});
await new Promise(r=>srv.listen(5596,r));
const LONG_OPEN = Array.from({length:8},(_,i)=>`This is paragraph ${i+1} of a deliberately long opening from your future self, written so the thread overflows the viewport and the starting scroll position actually matters to the reader.`).join('\n\n');
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1280,height:760},deviceScaleFactor:1});
const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,160)));
await pg.route('**/api/**',r=>{const u=r.request().url();let d={ok:true};
  if(u.includes('/api/phase-b/session'))d={sessionId:'pb1',opening:'What pulls you in right now?'};
  else if(u.includes('/api/phase-c/session'))d={sessionId:'pc1',opening:LONG_OPEN};
  else if(u.includes('/api/chat'))d={reply:'Short reply.',recommendations:[{title:'Data analyst',why:'Turn messy data into clear stories.',path:'SQL + an internship.'},{title:'UX researcher',why:'Curious about people.',path:'Run two studies.'}]};
  else if(u.includes('/api/validate-career'))d={ok:true};
  else if(u.endsWith('/api/sessions'))d={id:'s1',condition:'main'};
  r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});});
const T=(t)=>pg.locator('button',{hasText:t}).first();
const settle=async(ms=350)=>{await pg.evaluate(()=>document.fonts&&document.fonts.ready);await pg.waitForTimeout(ms);};
const shot=async(n)=>{await settle();await pg.screenshot({path:path.join(ROOT,'shots',`cs-${n}.png`)});console.log('  ✓ cs-'+n);};
const safe=async(loc,ms=3000)=>{try{if(await loc.count()&&await loc.isEnabled())await loc.click({timeout:ms});}catch(e){}};
const fail=(m)=>{console.error('✗ '+m);process.exitCode=1;};
const autofill=async()=>pg.evaluate(()=>{const set=(el,v)=>{const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
  document.querySelectorAll('input[type=number]').forEach(i=>set(i,'21'));
  document.querySelectorAll('input[type=text],input:not([type])').forEach(i=>set(i,'Psychology'));
  document.querySelectorAll('.sv-choices').forEach(g=>{if(!g.querySelector('.sv-choice.on'))g.querySelector('.sv-choice')?.click();});
  document.querySelectorAll('.sv-multi').forEach(g=>g.querySelectorAll('.sv-choice').forEach((c,i)=>i<2&&c.click()));
  document.querySelectorAll('.sv-scale').forEach(s=>{const p=s.querySelectorAll('.sv-pt');p.length&&p[p.length-1].click();});
  document.querySelectorAll('.sv-ios').forEach(s=>{const o=s.querySelectorAll('.sv-ios-opt');o.length&&o[3].click();});});
const scrollTop=()=>pg.locator('.chat-scroll').first().evaluate(el=>el.scrollTop);
try{
  await pg.goto('http://localhost:5596/',{waitUntil:'networkidle'}); await pg.waitForSelector('.landing-hero',{timeout:20000});
  await T('Begin').click(); await settle(150);
  await pg.locator('.consent-check input').check().catch(()=>{}); await T('I agree').click(); await settle(150);
  await pg.locator('.flow-body input').first().fill('Maya'); await T('Continue').click(); await settle(150);
  for(let i=0;i<16;i++){ if(!(await pg.locator('.flow-progress').count()))break; await autofill(); await pg.waitForTimeout(40); const btn=(await T('Done').count())?T('Done'):T('Continue'); if(!(await btn.count())||await btn.isDisabled())break; await safe(btn); await pg.waitForTimeout(70); }
  await safe(T('Continue')); await settle(150); // pause A→B
  await pg.locator('.pb-composer textarea').fill('I like turning data into stories.').catch(()=>{});
  await safe(pg.locator('.pb-composer .send')); await pg.waitForTimeout(400);
  await safe(pg.locator('.rec-card').first()); await pg.waitForTimeout(250);
  await pg.evaluate(()=>document.querySelectorAll('.pb-lock-sheet .sv-scale').forEach(s=>{const p=s.querySelectorAll('.sv-pt');p.length&&p[p.length-1].click();}));
  await pg.locator('.pb-lock-sheet input').first().fill('Data analyst').catch(()=>{}); await settle(150);
  await safe(T('Step into this future')); await pg.waitForTimeout(300);
  await safe(T('Begin')); await settle(400); // pause B→C → roleplay
  await pg.waitForSelector('.chat-scroll',{timeout:8000});
  await settle(400);
  // ASSERT: opens at the TOP
  const st0=await scrollTop();
  console.log('  scrollTop at start =',st0);
  if(st0>5) fail(`role-play did not open at the top (scrollTop=${st0})`); else console.log('  ✓ opens at the top');
  await shot('1-start-top');
  // send a message → should follow to the bottom
  await pg.locator('.composer textarea').fill('What surprised you most?');
  await safe(pg.locator('.composer .send')); await pg.waitForTimeout(700);
  const el=pg.locator('.chat-scroll').first();
  const atBottom=await el.evaluate(e=>Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<8);
  console.log('  at bottom after sending =',atBottom);
  if(!atBottom) fail('did not follow to the newest turn after sending'); else console.log('  ✓ follows newest turn after a send');
  await shot('2-after-send-bottom');
}catch(e){ fail('walk error: '+e.message); }
console.log('PAGE ERRORS:',errs.length); errs.slice(0,4).forEach(e=>console.log('  -',e));
await b.close(); srv.close();
console.log(process.exitCode?'\nCHAT-SCROLL CHECK FAILED ✗':'\nCHAT-SCROLL CHECK PASSED ✅');
