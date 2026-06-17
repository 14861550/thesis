/* Targeted capture of the Phase-C chat (and Phase-B lock) — dev only. */
import { chromium } from 'playwright';
import http from 'http';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.jsx':'text/babel','.json':'application/json','.svg':'image/svg+xml' };
const server = http.createServer((req,res)=>{ let p=decodeURIComponent((req.url||'/').split('?')[0]); if(p==='/')p='/index.html'; const fp=path.join(ROOT,p); if(!existsSync(fp)){res.writeHead(404);return res.end('nf');} res.writeHead(200,{'content-type':MIME[path.extname(fp)]||'text/plain'}); res.end(readFileSync(fp)); });
await new Promise(r=>server.listen(5599,r));
const RECS=[{title:'Data analyst',why:'You like turning messy data into clear, honest stories people can act on.',path:'SQL + one stats course, then an analytics internship.'},{title:'Product manager',why:'You organise people and ideas and hold the through-line.',path:'Join an APM programme; ship one small project end to end.'}];
const b = await chromium.launch({ args:['--ignore-certificate-errors'] });
async function cap(vp){
  const ctx = await b.newContext({viewport:{width:vp.w,height:vp.h}, deviceScaleFactor:1, ignoreHTTPSErrors:true});
  const page = await ctx.newPage();
  await page.route('**/api/**', r=>{const u=r.request().url();let d={ok:true};
    if(u.includes('/api/phase-b/session'))d={sessionId:'pb1',opening:'Before we step in — what in your studies genuinely pulls you in right now?'};
    else if(u.includes('/api/phase-c/session'))d={sessionId:'pc1',opening:"Hey — it's me. You, ten years on.\n\nI still remember sitting exactly where you are, trying to picture all this. What's on your mind today?"};
    else if(u.includes('/api/chat'))d={reply:"That tracks — it's the same pull that got me here.\n\nWhen I was deciding, I kept waiting to feel sure. What actually moved me was treating the next step as an experiment, not a vow. Smaller, but real.",recommendations:RECS};
    else if(u.includes('/api/validate-career'))d={ok:true};
    else if(u.endsWith('/api/sessions'))d={id:'s1',condition:'main',persisted:true};
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});});
  const T=(t,s='button')=>page.locator(s,{hasText:t}).first();
  const settle=async(ms=400)=>{await page.evaluate(()=>document.fonts&&document.fonts.ready);await page.waitForTimeout(ms);};
  await page.goto('http://localhost:5599/',{waitUntil:'networkidle'});
  await page.waitForSelector('.landing-hero',{timeout:20000});
  await T('Begin').click(); await settle(200);
  await page.locator('.consent-check input').check().catch(()=>{}); await T('I agree').click(); await settle(200);
  await page.locator('.flow-body input').first().fill('Maya'); await T('Continue').click(); await settle(200);
  for(let i=0;i<14;i++){ if(!(await page.locator('.flow-progress').count()))break;
    await page.evaluate(()=>{const set=(el,v)=>{const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
      document.querySelectorAll('input[type=number]').forEach(i=>set(i,'21'));
      document.querySelectorAll('.sv-choices').forEach(g=>{if(!g.querySelector('.sv-choice.on'))g.querySelector('.sv-choice')?.click();});
      document.querySelectorAll('.sv-multi').forEach(g=>g.querySelectorAll('.sv-choice').forEach((c,i)=>i<3&&c.click()));
      document.querySelectorAll('.sv-scale').forEach(s=>{const p=s.querySelectorAll('.sv-pt');p.length&&p[p.length-1].click();});
      document.querySelectorAll('.sv-ios').forEach(s=>{const o=s.querySelectorAll('.sv-ios-opt');o.length&&o[3].click();});
      document.querySelectorAll('textarea').forEach(t=>{if(!t.value&&!t.disabled)set(t,'A few honest words.');});});
    await page.waitForTimeout(60);
    const btn=(await T('Done').count())?T('Done'):T('Continue'); if(!(await btn.count())||await btn.isDisabled())break; await btn.click(); await page.waitForTimeout(80);
  }
  if(await T('Continue').count()){await T('Continue').click(); await settle(300);} // pause A→B
  await page.locator('.pb-composer textarea').fill('I like turning messy data into clear stories people use.').catch(()=>{});
  await page.locator('.pb-composer .send').click().catch(()=>{}); await page.waitForTimeout(700);
  await page.screenshot({path:path.join(ROOT,'shots',`06b-recs-thread.${vp.name}.png`)}); // cards in the thread
  await page.locator('.rec-card').first().click().catch(()=>{}); await page.waitForTimeout(300);
  // lock sheet: set both scales fully, then step in
  await page.evaluate(()=>document.querySelectorAll('.pb-lock-sheet .sv-scale').forEach(s=>{const p=s.querySelectorAll('.sv-pt');p.length&&p[p.length-1].click();}));
  await page.locator('.pb-lock-sheet input').first().fill('Data analyst').catch(()=>{});
  await settle(300);
  await page.screenshot({path:path.join(ROOT,'shots',`07b-lock.${vp.name}.png`)});
  const safe=async(loc,ms=3000)=>{try{if(await loc.count()&&await loc.isEnabled())await loc.click({timeout:ms});}catch(e){}};
  await safe(T('Step into this future')); await page.waitForTimeout(400);
  await safe(T('Begin')); await page.waitForTimeout(500); // pause B→C
  await page.waitForSelector('.chat-app',{timeout:8000}).catch(()=>{});
  await settle(400);
  await page.screenshot({path:path.join(ROOT,'shots',`08-chat.${vp.name}.png`)});
  console.log('captured', vp.name, '— chat-app present:', await page.locator('.chat-app').count(), 'lock-enabled-was:', await T('Step into this future').count()? await T('Step into this future').isEnabled().catch(()=>'n/a'):'absent');
  await ctx.close();
}
await cap({name:'laptop',w:1440,h:900});
await cap({name:'mobile',w:390,h:844});
await b.close(); server.close();
