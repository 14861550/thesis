/*
 * lib/recs.js — extract the stage-B recommendation block from a guide reply.
 *
 * The guide is prompted to emit a ```json {"recommendations":[...]}``` block.
 * Models drift: missing closing fence, no fence at all, uppercase tag, smart
 * quotes, prose wrapped around the object. If extraction fails the RAW JSON
 * leaks into the chat bubble (seen live with reflective on gpt-5.1), so this
 * parser is deliberately forgiving:
 *   1. try the fenced block;
 *   2. fall back to brace-matching the object that contains "recommendations";
 *   3. parse as-is, then once more with smart quotes normalised;
 *   4. on success, strip the matched block AND any stray fence markers from
 *      the visible text.
 */

export const PHASE_B_REC_FALLBACK =
  "Based on what you've shared, here are five directions worth exploring — tap whichever you're most curious to step into.";

function parseRecs(body) {
  for (const candidate of [body, body.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")]) {
    try {
      const parsed = JSON.parse(candidate.trim());
      if (Array.isArray(parsed && parsed.recommendations)) {
        const recs = parsed.recommendations
          .filter((r) => r && r.title)
          .slice(0, 5)
          .map((r) => ({
            title: String(r.title).slice(0, 120),
            why: String(r.why || '').slice(0, 400),
            path: String(r.path || '').slice(0, 400),
          }));
        if (recs.length) return recs;
      }
    } catch (e) { /* try the next candidate */ }
  }
  return null;
}

/** Brace-match the JSON object that contains `"recommendations"` (string-aware). */
function braceMatch(reply) {
  const idx = reply.indexOf('"recommendations"');
  if (idx === -1) return null;
  const start = reply.lastIndexOf('{', idx);
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < reply.length; i++) {
    const ch = reply[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return reply.slice(start, i + 1); }
  }
  return null;
}

export function extractRecommendations(reply) {
  const text = reply || '';
  const candidates = [];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push({ raw: fence[0], body: fence[1] });
  const bare = braceMatch(text);
  if (bare) candidates.push({ raw: bare, body: bare });
  for (const c of candidates) {
    const recs = parseRecs(c.body);
    if (recs) {
      const clean = text
        .replace(c.raw, '')
        .replace(/```(?:json)?/gi, '')   // stray/unclosed fence markers
        .replace(/`{2,}/g, '')
        .trim() || PHASE_B_REC_FALLBACK;
      return { clean, recommendations: recs };
    }
  }
  return { clean: text, recommendations: null };
}
