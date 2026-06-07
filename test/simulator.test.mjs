/*
 * Offline unit test for the silicon-participant engine.
 *
 * No network, no DB, no API key: a deterministic stub LLM is injected. The stub
 * also ASSERTS that every call it receives is a valid Anthropic message sequence
 * (starts with role 'user', strictly alternating) — so a broken role mapping in
 * the engine fails here instead of in production.
 *
 * Run from a directory WITHOUT a .env so dotenv (override:true) can't pull the
 * real DATABASE_URL / ANTHROPIC_API_KEY:
 *   cd /tmp && node <repo>/test/simulator.test.mjs
 */

import assert from 'node:assert/strict';
import { runSimulatedConversation, profileDataFromStudy } from '../lib/simulator.js';

let botCalls = 0;
let simCalls = 0;

function assertValidSequence(messages, who) {
  assert.ok(Array.isArray(messages) && messages.length > 0, `${who}: empty messages`);
  assert.equal(messages[0].role, 'user', `${who}: must start with a user message`);
  for (let i = 0; i < messages.length; i++) {
    const expected = i % 2 === 0 ? 'user' : 'assistant';
    assert.equal(messages[i].role, expected, `${who}: role at ${i} should be ${expected}`);
    assert.equal(typeof messages[i].content, 'string', `${who}: content must be a string`);
  }
}

// Stub LLM: routes by system prompt; validates sequences; returns deterministic text.
function stubLlm(system, messages) {
  const isSim = system.includes('role-playing a real University of Amsterdam student');
  if (isSim) { assertValidSequence(messages, 'SIM'); simCalls += 1; return `SIM utterance ${simCalls}`; }
  assertValidSequence(messages, 'BOT'); botCalls += 1; return `BOT utterance ${botCalls}`;
}

const profileData = {
  year: 'First year',
  demographics: { age: 19, gender: 'Man', major: 'Economics & Business' },
  bigFive: { O: 3, C: 3, E: 5, A: 3, N: 4 },
  values: ['Achievement', 'Influence / leadership'],
  riasec: { R: 2, I: 3, A: 2, S: 3, E: 5, C: 4 },
  career: 'Startup Founder', familiarity: 2, interestStrength: 7,
};

const TURNS = 3;
const transcript = await runSimulatedConversation({ profileData, condition: 'main', turns: TURNS, llm: stubLlm });

// --- shape assertions ---
assert.ok(Array.isArray(transcript), 'transcript is an array');
assert.equal(transcript[0].role, 'assistant', 'opens with the future-self bot');
const users = transcript.filter((m) => m.role === 'user');
const bots = transcript.filter((m) => m.role === 'assistant');
assert.equal(users.length, TURNS, `participant turns == ${TURNS}`);
assert.equal(bots.length, TURNS, `bot turns == ${TURNS} (opening + ${TURNS - 1} replies)`);
assert.equal(transcript.length, TURNS * 2, 'total turns == 2*turns');
// strict alternation assistant,user,assistant,user,...
transcript.forEach((m, i) => {
  assert.equal(m.role, i % 2 === 0 ? 'assistant' : 'user', `alternation at ${i}`);
  assert.equal(typeof m.text, 'string', `text is string at ${i}`);
  assert.ok(m.text.length > 0, `non-empty text at ${i}`);
});

// call accounting: opening + (turns-1) bot replies = turns bot calls; turns sim calls
assert.equal(botCalls, TURNS, 'bot LLM calls == turns');
assert.equal(simCalls, TURNS, 'sim LLM calls == turns');

// --- profileDataFromStudy mapping ---
const study = {
  preSurvey: { age: 21, gender: 'Woman', year: 'Second year' },
  scores: { bigFive: { O: 4 }, riasec: { I: 5 }, values: ['Autonomy'] },
  phaseB: { career: 'Data Scientist', familiarity: 3, interestStrength: 6 },
};
const pd = profileDataFromStudy(study);
assert.equal(pd.career, 'Data Scientist');
assert.equal(pd.demographics.age, 21);
assert.equal(pd.demographics.gender, 'Woman');
assert.equal(pd.familiarity, 3);
assert.deepEqual(pd.values, ['Autonomy']);

console.log(`PASS — ${transcript.length} turns (bot ${botCalls}, sim ${simCalls}); sequences valid; profileData mapping OK`);
