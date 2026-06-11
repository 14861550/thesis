/*
 * lib/personas.js — turn a selected cohort CSV row (scripts/select_cohort.py
 * output) into the app's `profileData` object that the bot + persona prompts eat.
 *
 * The CSV gives the REAL backbone (Big Five + RIASEC + demographics). Three
 * fields the dataset lacks are assigned by rule: the chosen 10-year career (from
 * the major + top RIASEC), work values, and familiarity/interest. No LLM here.
 */

import fs from 'node:fs';

// --- tiny RFC4180-ish CSV parser (handles quoted fields with commas) --------
function parseCsv(text) {
  const rows = [];
  let field = '', row = [], inq = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inq) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inq = false; }
      else field += c;
    } else if (c === '"') inq = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const CAREER_BY_MAJOR = [
  [/account/i, ['Accountant', 'Auditor', 'Financial Controller']],
  [/financ/i, ['Financial Analyst', 'Investment Banker', 'Risk Analyst']],
  [/(data|analyt|statist)/i, ['Data Analyst', 'Data Scientist', 'Business Intelligence Analyst']],
  [/market/i, ['Marketing Manager', 'Brand Strategist']],
  [/(information system|info sys)/i, ['Business Intelligence Analyst', 'IT Consultant']],
  [/econ/i, ['Economist', 'Data Analyst', 'Policy Analyst']],
  [/entrepreneur/i, ['Startup Founder', 'Product Manager']],
  [/(supply|operations|logistic)/i, ['Supply Chain Analyst', 'Operations Manager']],
  [/(management|business|administ|commerc)/i, ['Management Consultant', 'Product Manager', 'Operations Manager']],
];
const CAREER_BY_RIASEC = {
  R: ['Operations Manager', 'Supply Chain Analyst'],
  I: ['Data Analyst', 'Economist', 'Quantitative Analyst'],
  A: ['Brand Strategist', 'UX Researcher'],
  S: ['Management Consultant', 'HR Manager'],
  E: ['Startup Founder', 'Product Manager', 'Investment Banker'],
  C: ['Accountant', 'Financial Controller', 'Risk Analyst'],
};

export function topRiasec(riasec = {}) {
  return Object.entries(riasec).sort((a, b) => b[1] - a[1])[0]?.[0] || 'E';
}

export function assignCareer(riasec, major, seed) {
  const m = (major || '').toString();
  let list = null;
  for (const [re, careers] of CAREER_BY_MAJOR) if (re.test(m)) { list = careers; break; }
  if (!list) list = CAREER_BY_RIASEC[topRiasec(riasec)] || CAREER_BY_RIASEC.E;
  return list[hashStr(String(seed || m)) % list.length];
}

export function assignValues(riasec = {}, bigFive = {}) {
  const v = ['Achievement'];
  if ((riasec.E || 0) >= 3.3) v.push('Influence / leadership');
  if ((riasec.I || 0) >= 3.3) v.push('Intellectual challenge');
  if ((riasec.C || 0) >= 3.3) v.push('Stability and security');
  if ((bigFive.O || 0) >= 4.9) v.push('Variety and creativity'); // 3.6/5 ≡ 4.9/7 (bigFive now /7)
  v.push('Financial reward');
  return [...new Set(v)].slice(0, 3);
}

function yearForAge(age) {
  if (age <= 19) return 'First year';
  if (age <= 21) return 'Second year';
  return 'Third year';
}

/** Load the cohort CSV (selector output) into [profileData]. */
export function loadCohort(csvPath, { limit } = {}) {
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8').trim());
  const header = rows[0].map((h) => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const get = (r, k) => (idx[k] != null ? r[idx[k]] : undefined);
  const num = (r, k) => Number(get(r, k));

  let data = rows.slice(1).filter((r) => r.length >= header.length - 1);
  if (limit) data = data.slice(0, limit);

  return data.map((r, n) => {
    const pid = (get(r, 'pid') || `PID${String(n + 1).padStart(3, '0')}`).trim();
    const riasec = {
      R: num(r, 'riasec_R'), I: num(r, 'riasec_I'), A: num(r, 'riasec_A'),
      S: num(r, 'riasec_S'), E: num(r, 'riasec_E'), C: num(r, 'riasec_C'),
    };
    // Dataset Big Five is on /5; the fielded battery is TIPI (/7 native, fourth
    // dimension = Emotional Stability) — rescale here so every downstream
    // consumer (persona prompt, bot profile block, eval) speaks one /7 dialect
    // (§14b sync). ES is the reverse of the dataset's Neuroticism (6 − N on /5).
    const to7 = (x) => (Number.isNaN(x) ? x : Math.round((1 + (x - 1) * 1.5) * 10) / 10);
    const bigFive = {
      O: to7(num(r, 'big5_O')), C: to7(num(r, 'big5_C')), E: to7(num(r, 'big5_E')),
      A: to7(num(r, 'big5_A')), ES: to7(6 - num(r, 'big5_N')),
    };
    const age = num(r, 'age');
    const major = (get(r, 'major') || '').trim();
    const famJitter = hashStr(pid) % 3;          // 1..3
    return {
      _pid: pid,
      year: yearForAge(age),
      demographics: { age, gender: (get(r, 'gender') || '').trim(), major: major || 'Economics & Business' },
      bigFive, riasec,
      values: assignValues(riasec, bigFive),
      career: assignCareer(riasec, major, pid),
      familiarity: 1 + famJitter,                // low: they chose it to explore
      interestStrength: 6 + (hashStr(pid + 'i') % 2), // 6-7: high
    };
  });
}
