# Why Phase B asks a few questions before recommending careers

*Short note for the 14 Jun feedback — Shuai asked why the recommended occupations/majors are not just computed straight from the questionnaire, and why the extra Q&A is there. This explains the reasoning; it is a design rationale, not a code change.*

## The short version

The questionnaire (TIPI personality, RIASEC interests, work values) tells us what a student is *generally like*. It does not tell us what they *want right now*, in their own words, from a career they would actually step into. Phase B's few questions close that gap before we propose five directions.

## Why the questionnaire alone isn't enough

It's descriptive, not prescriptive. "High Investigative interest, values independence" describes a disposition — it doesn't pin down a job. Several very different careers fit the same profile, and the gap between a trait score and a concrete occupation is exactly where the interesting choices live.

A few things the scales can't surface on their own:

- **What the student currently wants.** Trade-offs between impact, stability, autonomy, money, and people shift with mood, term, and life stage. A short conversation catches the *current* weighting; a one-off questionnaire freezes a single snapshot.
- **What they already have in mind.** Many students arrive with a vague pull toward something. Ignoring that and handing them a computed list reads as the app not listening.
- **Options they don't know exist.** First- and second-year Economics & Business students haven't met most of the roles their profile would fit. The guide can gently stretch beyond the obvious defaults — which a lookup table keyed on RIASEC can't do.
- **Geography that has to be realistic.** The career has to make sense in the place they're drawn to. That only comes up in conversation, and it matters before they commit.

## Why it's a conversation, not three more survey items

Two reasons. First, a recommendation the student helped shape — by answering a couple of open questions in their own words — feels like theirs, not like an output. Second, the short exchange builds a thread of continuity into Phase C: the future self can pick up what the student said here, so the role-play doesn't start cold.

## What it is *not*

It is deliberately light — three or four short questions, one at a time, then five directions. It is not a second questionnaire, and it is not a clinical assessment. The profile from Phase A still does real work: it's passed silently into both phases to calibrate voice and continuity. The Q&A adds the part a questionnaire structurally can't — what this particular person wants today.

## Where this lives in the code

- Guided questions + the five-direction format: `lib/prompt.js` (`buildPhaseBPrompt` / the Phase-B prompt variants).
- Card extraction from the model's reply: `lib/recs.js`.
- The UI (cards, the lock-in panel, the chooser prompt): `phaseb.jsx`.
