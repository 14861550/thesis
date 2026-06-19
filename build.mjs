/* Minimal production build (item 4, minimal version).
 *
 * Removes the two runtime costs of the zero-build setup:
 *   1. in-browser Babel transpile of every .jsx on each load, and
 *   2. the unpkg CDN dependency for React / ReactDOM / Babel.
 *
 * It precompiles each .jsx → plain classic-script JS in build/ (JSX →
 * React.createElement against the global React — no module imports), each
 * wrapped in an IIFE so files don't share one global lexical scope (classic
 * scripts otherwise collide on e.g. `const { useState } = React`). Cross-file
 * sharing already goes through explicit window.* exports, unchanged. React's
 * production UMD builds are vendored into vendor/.
 *
 * Intentionally NOT a bundler/minifier (kept minimal per request). The output
 * is committed so the static deploy needs no build step; re-run `npm run build`
 * after editing any .jsx and commit the result. test/build_sync_test.mjs fails
 * if build/ drifts from the .jsx source.
 */
import babel from '@babel/core';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
// Same order index.html loads them in.
export const SRC = ['tweaks-panel', 'graphics', 'screens', 'survey', 'chat', 'phaseb', 'app'];

// Standalone gated dashboards (admin + results): one self-contained .jsx each,
// compiled in place beside their gated HTML. Same classic-script IIFE wrapper and
// the same vendored React global as the app bundles — just precompiled so these
// pages also have no runtime Babel and no CDN dependency to load.
export const PAGES = [
  { src: 'admin/admin.jsx', out: 'admin/admin.js' },
  { src: 'results/results.jsx', out: 'results/results.js' },
];

// Transpile one .jsx (path relative to ROOT) → the exact bytes we write out. Pure
// (no I/O) so the sync-guard test can compare against the committed output.
export function compilePath(relSrc) {
  const src = readFileSync(path.join(ROOT, relSrc), 'utf8');
  const { code } = babel.transformSync(src, {
    filename: relSrc,
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    sourceType: 'script',
    configFile: false,
    babelrc: false,
    comments: false,
    compact: false,
  });
  return `/* compiled from ${relSrc} — do not edit; run \`npm run build\` */\n(function () {\n${code}\n})();\n`;
}

// App bundle helper: compile <name>.jsx (at ROOT) → build/<name>.js bytes.
export function compile(name) {
  return compilePath(`${name}.jsx`);
}

function run() {
  mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  mkdirSync(path.join(ROOT, 'vendor'), { recursive: true });
  for (const name of SRC) {
    writeFileSync(path.join(ROOT, 'build', `${name}.js`), compile(name));
    console.log('  ✓ build/' + name + '.js');
  }
  for (const { src, out } of PAGES) {
    writeFileSync(path.join(ROOT, out), compilePath(src));
    console.log('  ✓ ' + out);
  }
  for (const [from, to] of [
    ['react/umd/react.production.min.js', 'react.production.min.js'],
    ['react-dom/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
  ]) {
    copyFileSync(path.join(ROOT, 'node_modules', from), path.join(ROOT, 'vendor', to));
    console.log('  ✓ vendor/' + to);
  }
  console.log('Build complete — load build/*.js + vendor/*.js from index.html.');
}

// Run only when invoked directly (`node build.mjs`), not when imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
