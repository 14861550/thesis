/* Tests for lib/recs.js — the stage-B recommendation extractor must survive
 * model drift: missing closing fence, no fence, smart quotes, prose around.
 * Run: node test/recs_test.mjs */
import { extractRecommendations, PHASE_B_REC_FALLBACK } from '../lib/recs.js';

const RECS = '{"recommendations":[{"title":"Management Consulting","why":"You like varied problems.","path":"Casing + internship."},{"title":"Corporate Finance","why":"Numbers tied to decisions.","path":"Finance electives."},{"title":"Product Management","why":"Markets and user behavior.","path":"SQL + startup internship."},{"title":"Policy Research","why":"Economics with public impact.","path":"MSc + traineeship."},{"title":"ESG Consulting","why":"Markets meet sustainability.","path":"ESG electives."}]}';

let failures = 0;
const check = (name, reply, { expectCards, cleanShouldNotContain = [] }) => {
  const { clean, recommendations } = extractRecommendations(reply);
  const cards = recommendations ? recommendations.length : 0;
  let ok = expectCards === cards;
  for (const frag of cleanShouldNotContain) if (clean.includes(frag)) ok = false;
  console.log((ok ? '✓' : '✗') + ' ' + name + (ok ? '' : ` — got ${cards} cards; clean=${JSON.stringify(clean.slice(0, 120))}`));
  if (!ok) failures++;
};

check('proper fenced block', `Here are five directions.\n\n\`\`\`json\n${RECS}\n\`\`\`\n\nPick one.`,
  { expectCards: 5, cleanShouldNotContain: ['recommendations', '```'] });

check('fence missing the closing backticks', `Here are five:\n\n\`\`\`json ${RECS}\n\nPick the one you like.`,
  { expectCards: 5, cleanShouldNotContain: ['recommendations', '```', '{'] });

check('no fence at all (bare JSON)', `Here are five directions:\n\n${RECS}\n\nWhich would you step into?`,
  { expectCards: 5, cleanShouldNotContain: ['recommendations', '{'] });

check('smart quotes inside the JSON', `\`\`\`json\n${RECS.replace(/"/g, '“')}\n\`\`\``,
  { expectCards: 5 });

check('uppercase tag + leading spaces', `   \`\`\`JSON\n${RECS}\n\`\`\``, { expectCards: 5 });

check('reply with no recommendations stays untouched', 'Just a normal question back to you?', { expectCards: 0 });

const { clean: onlyBlock } = extractRecommendations(`\`\`\`json\n${RECS}\n\`\`\``);
if (onlyBlock !== PHASE_B_REC_FALLBACK) { console.log('✗ fallback lead-in when reply is only the block'); failures++; }
else console.log('✓ fallback lead-in when reply is only the block');

if (failures) { console.error(`\n${failures} RECS TESTS FAILED`); process.exit(1); }
console.log('\nRECS TESTS PASSED ✅');
