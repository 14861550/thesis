/* Guard: the committed build/*.js must match a fresh compile of each .jsx, so
 * the precompiled bundle served in production never silently drifts from source.
 * If this fails, run `npm run build` and commit the result. */
import { readFileSync } from 'fs';
import path from 'path';
import { compile, compilePath, SRC, PAGES, ROOT } from '../build.mjs';

let failed = 0;
for (const name of SRC) {
  const expected = compile(name);
  let actual = '';
  try { actual = readFileSync(path.join(ROOT, 'build', `${name}.js`), 'utf8'); } catch (e) {}
  if (actual !== expected) {
    console.error(`✗ build/${name}.js is stale or missing — run \`npm run build\``);
    failed++;
  }
}
// Gated dashboards (admin/admin.js, results/results.js) are guarded the same way.
for (const { src, out } of PAGES) {
  const expected = compilePath(src);
  let actual = '';
  try { actual = readFileSync(path.join(ROOT, out), 'utf8'); } catch (e) {}
  if (actual !== expected) {
    console.error(`✗ ${out} is stale or missing — run \`npm run build\``);
    failed++;
  }
}
if (failed) { console.error(`BUILD SYNC TEST FAILED (${failed} file(s) out of date)`); process.exit(1); }
console.log('BUILD SYNC TEST PASSED ✅');
