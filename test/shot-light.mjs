/* Capture the light theme on key screens (dev only). Toggles theme via the
 * comfort panel since tweaks.theme isn't persisted to localStorage. */
import { chromium } from 'playwright';
import http from 'http'; import { readFileSync, existsSync } from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME={'.html':'text/html','.css':'text/css','.js':'application/javascript','.jsx':'text/babel','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent((q.url||'/').split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!existsSync(fp)){s.writeHead(404);return s.end('nf');}s.writeHead(200,{'content-type':MIME[path.extname(fp)]||'text/plain'});s.end(readFileSync(fp));});
await new Promise(r=>srv.listen(5599,r));
const b=await chromium.launch({args:['--ignore-certificate-errors']});
const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,ignoreHTTPSErrors:true});
const pg=await ctx.newPage();
await pg.route('**/api/**',r=>{let d={ok:true};if(r.request().url().endsWith('/api/sessions'))d={id:'s1',persisted:true};r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});});
const T=(t,s='button')=>pg.locator(s,{hasText:t}).first();
const settle=async(ms=350)=>{await pg.evaluate(()=>document.fonts&&document.fonts.ready);await pg.waitForTimeout(ms);};
await pg.goto('http://localhost:5599/',{waitUntil:'networkidle'}); await pg.waitForSelector('.landing-hero',{timeout:20000});
// switch to light via the comfort panel
await pg.locator('.comfort-fab').click(); await pg.waitForTimeout(300);
await pg.locator('.comfort-seg button', {hasText:'Light'}).first().click(); await pg.waitForTimeout(200);
await pg.locator('.comfort-close, .comfort-fab').first().click().catch(()=>{}); await settle();
console.log('theme now:', await pg.evaluate(()=>document.documentElement.dataset.theme));
await pg.screenshot({path:path.join(ROOT,'shots',`light-landing.png`)});
// walk to survey
await T('Begin').click(); await settle(150);
await pg.screenshot({path:path.join(ROOT,'shots',`light-consent.png`)});
await pg.locator('.consent-check input').check().catch(()=>{}); await T('I agree').click(); await settle(150);
await pg.locator('.flow-body input').first().fill('Maya').catch(()=>{}); await T('Continue').click().catch(()=>{}); await settle(200);
await pg.screenshot({path:path.join(ROOT,'shots',`light-survey.png`)});
await b.close(); srv.close();
console.log('done');
