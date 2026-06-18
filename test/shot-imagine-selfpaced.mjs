/* Verify the self-paced imagination page: one line at a time, NO auto-advance,
 * a "Next" button reveals the following line, and the closing appears only on
 * the last line. Walks the real app (API mocked) to the pre-survey imagine page
 * and drives it manually, asserting behaviour + capturing each state. Dev-only. */
import { chromium } from 'playwright';
import http from 'http'; import { readFileSync, existsSync, mkdirSync } from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(ROOT, 'shots'), { recursive: true });
const MIME={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!existsSync(fp)){s.writeHead(404);return s.end('nf');}s.writeHead(200,{'content-type':MIME[path.extname(fp)]||'text/plain'});s.end(readFileSync(fp));});
await new Promise(r=>srv.listen(5597,r));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1280,height:880},deviceScaleFactor:1});
const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,160)));
await pg.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,id:'s1'})}));
const T=(t)=>pg.locator('button',{hasText:t}).first();
const settle=async(ms=300)=>{await pg.evaluate(()=>document.fonts&&document.fonts.ready);await pg.waitForTimeout(ms);};
const shot=async(n)=>{await settle();await pg.screenshot({path:path.join(ROOT,'shots',`sp-${n}.png`)});console.log('  ✓ sp-'+n);};
const lineText=()=>pg.locator('.sv-imagine-line').first().innerText();
const fail=(m)=>{console.error('✗ '+m);process.exitCode=1;};
const autofill=async()=>pg.evaluate(()=>{const set=(el,v)=>{const p=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
  document.querySelectorAll('input[type=number]').forEach(i=>set(i,'21'));
  document.querySelectorAll('input[type=text],input:not([type])').forEach(i=>set(i,'Psychology'));
  document.querySelectorAll('.sv-choices').forEach(g=>{if(!g.querySelector('.sv-choice.on'))g.querySelector('.sv-choice')?.click();});
  document.querySelectorAll('.sv-scale').forEach(s=>{const p=s.querySelectorAll('.sv-pt');p.length&&p[p.length-1].click();});});
try{
  await pg.goto('http://localhost:5597/',{waitUntil:'networkidle'}); await pg.waitForSelector('.landing-hero',{timeout:20000});
  await T('Begin').click(); await settle(150);
  await pg.locator('.consent-check input').check().catch(()=>{}); await T('I agree').click(); await settle(150);
  await pg.locator('.flow-body input').first().fill('Maya'); await T('Continue').click(); await settle(150);
  // advance pre-survey pages until the imagine page appears
  let hops=0;
  while(!(await pg.locator('.sv-imagine').count()) && hops<12){ await autofill(); await pg.waitForTimeout(50); await T('Continue').click().catch(()=>{}); await pg.waitForTimeout(120); hops++; }
  if(!(await pg.locator('.sv-imagine').count())) fail('never reached the imagine page');

  // --- assertions ---
  const dots=await pg.locator('.sv-imagine-dot').count();
  const total=await pg.evaluate(()=>document.querySelectorAll('.sv-imagine-dot').length);
  console.log('  lines(dots):',dots);
  if(!(await pg.locator('.sv-imagine-next').count())) fail('Next button missing on first line');
  const l1=await lineText(); await shot('1-line1');

  // KEY: no auto-advance — wait 2.5s without clicking; line must be unchanged
  await pg.waitForTimeout(2500);
  const l1b=await lineText();
  if(l1!==l1b) fail('line auto-advanced without a click (should be self-paced)'); else console.log('  ✓ no auto-advance after 2.5s');

  // click Next -> line 2
  await pg.locator('.sv-imagine-next').click(); await pg.waitForTimeout(200);
  const l2=await lineText();
  if(l2===l1) fail('Next did not change the line'); else console.log('  ✓ Next advanced to line 2');
  const onDots=await pg.locator('.sv-imagine-dot.on').count(); console.log('  active dots after 1 Next:',onDots);
  await shot('2-line2');

  // click Next through to the last line
  let guard=0;
  while((await pg.locator('.sv-imagine-next').count()) && guard<10){ await pg.locator('.sv-imagine-next').click(); await pg.waitForTimeout(150); guard++; }
  if(await pg.locator('.sv-imagine-next').count()) fail('Next button still present on last line');
  else console.log('  ✓ Next gone on last line');
  if(!(await pg.locator('.sv-imagine-close').count())) fail('closing line not shown on last line');
  else console.log('  ✓ closing shown on last line');
  await shot('3-last+closing');

  console.log(total===3?'  ✓ three progress dots':`  ! dot count = ${total}`);
}catch(e){ fail('walk error: '+e.message); }
console.log('PAGE ERRORS:',errs.length); errs.slice(0,4).forEach(e=>console.log('  -',e));
await b.close(); srv.close();
console.log(process.exitCode?'\nSELF-PACED CHECK FAILED ✗':'\nSELF-PACED CHECK PASSED ✅');
