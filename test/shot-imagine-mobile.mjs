/* Mobile (390px) screenshot of BOTH imagination pages — pre and post — to
 * confirm the new post page reads as well as the pre one on a phone. Dev-only;
 * mirrors shot-fullflow.mjs's mocked walk but stops at each imagine page. */
import { chromium } from 'playwright';
import http from 'http'; import { readFileSync, existsSync, mkdirSync } from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(ROOT, 'shots'), { recursive: true });
const MIME={'.html':'text/html','.css':'text/css','.js':'application/javascript','.jsx':'text/babel','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!existsSync(fp)){s.writeHead(404);return s.end('nf');}s.writeHead(200,{'content-type':MIME[path.extname(fp)]||'text/plain'});s.end(readFileSync(fp));});
await new Promise(r=>srv.listen(5598,r));
const RECS=[{title:'Data analyst',why:'Turn messy data into clear stories.',path:'SQL + an internship.'}];
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:780},deviceScaleFactor:2});
const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,160)));
await pg.route('**/api/**',r=>{const u=r.request().url();let d={ok:true};
  if(u.includes('/api/phase-b/session'))d={sessionId:'pb1',opening:'Before we step in — what pulls you in right now?'};
  else if(u.includes('/api/phase-c/session'))d={sessionId:'pc1',opening:"Hey — it's me. You, ten years on."};
  else if(u.includes('/api/chat'))d={reply:"That tracks.",recommendations:RECS};
  else if(u.includes('/api/validate-career'))d={ok:true};
  else if(u.endsWith('/api/sessions'))d={id:'s1',condition:'main',persisted:true};
  r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});});
const T=(t,s='button')=>pg.locator(s,{hasText:t}).first();
const settle=async(ms=350)=>{await pg.evaluate(()=>document.fonts&&document.fonts.ready);await pg.waitForTimeout(ms);};
const shot=async(n)=>{await settle();await pg.screenshot({path:path.join(ROOT,'shots',`im-${n}.png`)});console.log('  ✓ im-'+n);};
const safe=async(loc,ms=3000)=>{try{if(await loc.count()&&await loc.isEnabled())await loc.click({timeout:ms});}catch(e){}};
const autofill=async()=>pg.evaluate(()=>{const set=(el,v)=>{const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
  document.querySelectorAll('input[type=number]').forEach(i=>set(i,'21'));
  document.querySelectorAll('.sv-choices').forEach(g=>{if(!g.querySelector('.sv-choice.on'))g.querySelector('.sv-choice')?.click();});
  document.querySelectorAll('.sv-multi').forEach(g=>g.querySelectorAll('.sv-choice').forEach((c,i)=>i<2&&c.click()));
  document.querySelectorAll('.sv-scale').forEach(s=>{const p=s.querySelectorAll('.sv-pt');p.length&&p[p.length-1].click();});
  document.querySelectorAll('.sv-ios').forEach(s=>{const o=s.querySelectorAll('.sv-ios-opt');o.length&&o[3].click();});
  document.querySelectorAll('textarea').forEach(t=>{if(!t.value&&!t.disabled)set(t,'A few honest words.');});});
try{
  await pg.goto('http://localhost:5598/',{waitUntil:'networkidle'}); await pg.waitForSelector('.landing-hero',{timeout:20000});
  await T('Begin').click(); await settle(200);
  await pg.locator('.consent-check input').check().catch(()=>{}); await T('I agree').click(); await settle(200);
  await pg.locator('.flow-body input').first().fill('Maya'); await T('Continue').click(); await settle(200);
  let pre=false;
  for(let i=0;i<16;i++){
    if(!(await pg.locator('.flow-progress').count()) && !(await pg.locator('.sv-imagine').count()))break;
    if(!pre && await pg.locator('.sv-imagine').count()){ pre=true; await shot('pre-mobile'); }
    await autofill(); await pg.waitForTimeout(60);
    const btn=(await T('Done').count())?T('Done'):(await T('Continue').count()?T('Continue'):T('Begin'));
    if(!(await btn.count())||await btn.isDisabled())break; await safe(btn); await pg.waitForTimeout(80);
  }
  await safe(T('Continue')); await settle(200); // pause A→B
  await pg.locator('.pb-composer textarea').fill('I like turning messy data into clear stories.').catch(()=>{});
  await safe(pg.locator('.pb-composer .send')); await pg.waitForTimeout(500);
  await safe(pg.locator('.rec-card').first()); await pg.waitForTimeout(300);
  await pg.evaluate(()=>document.querySelectorAll('.pb-lock-sheet .sv-scale').forEach(s=>{const p=s.querySelectorAll('.sv-pt');p.length&&p[p.length-1].click();}));
  await pg.locator('.pb-lock-sheet input').first().fill('Data analyst').catch(()=>{}); await settle(200);
  await safe(T('Step into this future')); await pg.waitForTimeout(400);
  await safe(T('Begin')); await settle(300); // pause B→C
  await pg.waitForSelector('.chat-app',{timeout:8000}).catch(()=>{});
  await pg.locator('.composer textarea').fill('What surprised you most?').catch(()=>{});
  await safe(pg.locator('.composer .send')); await pg.waitForTimeout(500);
  await safe(T('Finish')); await pg.waitForTimeout(300);
  await safe(T('Finish & reflect')); await pg.waitForTimeout(300); await settle(200);
  if(await pg.locator('.pause-actions').count()){ await safe(T('Continue')); await settle(300); }
  // first post page is the new imagine page
  if(await pg.locator('.sv-imagine').count()) await shot('post-mobile');
}catch(e){ console.error('walk err', e.message); }
console.log('PAGE ERRORS:', errs.length); errs.slice(0,6).forEach(e=>console.log('  -',e));
await b.close(); srv.close();
