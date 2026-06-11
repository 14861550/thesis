/*
 * lib/db.js — Postgres connection + idempotent schema init.
 *
 * Persistence is OPTIONAL: if DATABASE_URL is unset the app runs in the original
 * in-memory mode. `dbEnabled` lets callers degrade gracefully.
 *
 * SSL is AUTO-DISCOVERED. Managed Postgres differs by host: Railway's private
 * `${{Postgres.DATABASE_URL}}` (*.railway.internal) speaks plaintext, while
 * public proxy hosts require SSL with a self-signed cert. Forcing the wrong one
 * makes EVERY query fail (the "List failed" / nothing-persists symptom). So we
 * try the most-likely SSL mode for the host, fall back to the other, and keep
 * whichever actually connects. Override with DATABASE_SSL=disable|require.
 */

import './env.js'; // populate process.env before reading DATABASE_URL below
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL || '';
export const dbEnabled = Boolean(url);

let pool = null;          // chosen, connected pool (lazy)
let connecting = null;    // in-flight ensurePool() promise (dedupe concurrent callers)
let chosenSsl;            // remember the winning ssl mode for logging

function hostOf(u) {
  return (u.match(/@([^:/?]+)/) || [])[1] || '';
}

/** SSL modes to try, best-guess first, so we self-heal in either direction. */
function sslCandidates() {
  const mode = (process.env.DATABASE_SSL || '').toLowerCase();
  if (mode === 'disable' || mode === 'false' || mode === 'off') return [false];
  if (mode === 'require' || mode === 'no-verify' || mode === 'true') return [{ rejectUnauthorized: false }];
  const host = hostOf(url);
  const plaintextHost =
    /^(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0)$/.test(host) ||
    /\.(railway\.internal|internal|local)$/.test(host);
  // plaintext hosts: try no-SSL first; public hosts: try SSL first. Always fall
  // back to the other so a wrong guess still recovers.
  return plaintextHost ? [false, { rejectUnauthorized: false }] : [{ rejectUnauthorized: false }, false];
}

function makePool(ssl) {
  const p = new pg.Pool({ connectionString: url, ssl, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
  p.on('error', (err) => console.error('[db] idle client error:', err?.message || err));
  return p;
}

/** Create (once) a pool whose SSL mode actually connects. Throws if none do. */
export async function ensurePool() {
  if (pool) return pool;
  if (!dbEnabled) throw new Error('DATABASE_URL not set — persistence disabled');
  if (connecting) return connecting;
  connecting = (async () => {
    let lastErr;
    for (const ssl of sslCandidates()) {
      const candidate = makePool(ssl);
      try {
        const client = await candidate.connect();
        await client.query('SELECT 1');
        client.release();
        pool = candidate;
        chosenSsl = ssl ? 'on' : 'off';
        console.log(`[db] connected to ${hostOf(url)} (ssl ${chosenSsl}).`);
        return pool;
      } catch (err) {
        lastErr = err;
        await candidate.end().catch(() => {});
        console.warn(`[db] connect attempt failed (ssl ${ssl ? 'on' : 'off'}): ${err?.message || err}`);
      }
    }
    connecting = null;
    throw lastErr || new Error('could not connect to the database');
  })();
  return connecting;
}

export async function query(text, params) {
  const p = await ensurePool();
  return p.query(text, params);
}

/** Lightweight health probe for /healthz — never throws. */
export async function probe() {
  if (!dbEnabled) return { ok: false, reason: 'DATABASE_URL not set' };
  try {
    await query('SELECT 1');
    return { ok: true, ssl: chosenSsl, host: hostOf(url) };
  } catch (err) {
    return { ok: false, reason: err?.message || String(err), host: hostOf(url) };
  }
}

/** Split schema.sql into individual statements (no functions/dollar-quotes in it). */
function splitStatements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))   // drop comment lines
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Run db/schema.sql idempotently, STATEMENT BY STATEMENT, so a single failing
 * statement (e.g. a CREATE EXTENSION the role can't run) cannot abort the whole
 * migration. Returns { ok, ran, failures }.
 */
export async function initSchema() {
  if (!dbEnabled) return { ok: false, ran: 0, failures: [] };
  await ensurePool();
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const statements = splitStatements(sql);
  let ran = 0;
  const failures = [];
  for (const stmt of statements) {
    try { await query(stmt); ran += 1; }
    catch (err) { failures.push({ stmt: stmt.slice(0, 60), error: err?.message || String(err) }); }
  }
  if (failures.length) {
    console.warn(`[db] schema init: ${ran} ok, ${failures.length} failed:`,
      failures.map((f) => `${f.stmt}… → ${f.error}`).join(' | '));
  }
  return { ok: failures.length === 0, ran, failures };
}

export async function closePool() {
  if (pool) { await pool.end(); pool = null; }
}
