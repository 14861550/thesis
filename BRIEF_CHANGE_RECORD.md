# Project Status Brief — Living Change Record

Companion to **Project Status Brief v4.1**. Evergreen: every design- or method-level
change since v4.1 is recorded here until folded into a Brief v4.2. Implementation
detail lives in the companion `BUILD_PLAN_CHANGE_RECORD.md`; this file records what
matters for the STUDY — design, stimuli, measurement, ethics, analysis. Maintainer:
Claude Code on behalf of Kangzhi Qin.

---

## 1. Design & routing changes

### 1.1 Stage-B default is now Andrea's *reflective* prompt (2026-06-11, Kangzhi's decision)

All cells — including Kangzhi's main vs baseline comparison — share Andrea's
reflective stage B by default. Kangzhi's guide prompt remains implemented as a
backup (`rec=guide`, third option in the researcher launcher). The intended-combo
allow-list is now `kangzhi: reflective×main / reflective×baseline;
andrea: reflective×main / direct×main`.

**Method consequence to write into Brief v4.2:** the stage-B location-negotiation
step existed only in the guide prompt; in the default flow the location is now
captured solely at the lock-in card (optional free-text), without a guided
discussion of geographic fit. The geographic-realism floor in stage C (both arms)
is unchanged, so realism is preserved; what is lost is the *negotiated* location.
Flag for supervisor awareness.

### 1.2 Stage-C prompt revisions (Appendices C and D — both arms, symmetric)

1. **Reply length**: "default 2-4 short paragraphs" → "aim for 2-3 short paragraphs,
   roughly 80-180 words; a fourth only when a scene earns it; multi-part questions
   get the most vivid part + an offer to go deeper." Identical in main and baseline
   so reply length cannot differ by condition. (Interim state during the same day:
   a strict ≤2-paragraph/60-110-word rule — live-verified enforceable but judged
   too terse by the researcher; relaxed the same day.) A short call-time system
   reminder of the length rule is appended server-side to every stage-C model call
   (never stored in transcripts; never applied to stage B).
2. **Real-time anchoring (realism floor, BOTH arms)**: the prompts now embed the
   actual current date; the future self speaks from exactly +10 years and must
   extrapolate society/technology plausibly — by the mid-2030s AI handles most of
   today's routine knowledge work (everyday coding, standard analysis), so career
   and skill advice must fit THAT world, never today's (no "go learn programming
   languages" answers that are already obsolete in the fiction's timeline).
   *Why baseline too (answering Kangzhi's design question):* exactly like the
   geographic-realism floor in v4.1, this is an honesty/realism requirement, not a
   manipulation component — leaving the baseline anchored in a stale present would
   introduce a realism asymmetry between arms and confound the comparison. The
   manipulation (profile, style mirroring, scenes, biographical bridging) remains
   exclusive to main.
3. **Natural questioning**: the future self may end with at most ONE question, and
   only when it grows out of what was just said; abrupt interview-style pivots
   (e.g. "What stopped you in the past from walking away from something hard?")
   are explicitly forbidden; if no question arises naturally, the reply ends with
   an opening instead. Second revision (same day): every question must additionally
   be BRIDGED into by a connecting sentence ("...which is making me wonder —") so
   it reads as caused by the preceding thought — bare questions, even on-topic
   ones, still felt abrupt. Rationale: pilot user experience — abrupt probes broke
   immersion and felt obligating. The KEEP-LEARNING goals (understanding the
   participant's present) are unchanged; only the delivery is constrained.

   *Note on the time anchor:* the dates are computed at the moment each
   conversation starts (`new Date()` in the prompt builder) — never a fixed
   "June 2026". Every session's prompt names the actual current month/year and
   its +10-year counterpart.

### 1.3 Participant-facing stimulus: "Ideas to ask" cards (new, both conditions)

After every future-self reply the app offers four tappable question cards, drawn
without repetition from a fixed neutral pool of 18 researcher-written questions
(verbatim list below — appendix material for the Brief). A similarity filter
suppresses ideas that overlap something the participant already asked. Free typing
is always available; tapped cards become ordinary user turns in the transcript.
The pool is deliberately static and identical across conditions (not
model-generated), so the nudge cannot differ between arms. Purpose: reduce
conversational fatigue and widen question breadth.

Pool (verbatim): 1. What does an ordinary Tuesday actually look like for you? ·
2. What's the hardest part nobody warned you about? · 3. How did you get from
where I am now to where you are? · 4. Did you ever doubt this path? · 5. How's the
money — honestly? · 6. What do your evenings and weekends look like? · 7. What
surprised you most about this work? · 8. What skill should I start building now? ·
9. What was your first job after graduating? · 10. What almost made you quit? ·
11. What would you do differently? · 12. Who are the people around you these
days? · 13. Where are you living, and do you like it? · 14. What does stress look
like for you now? · 15. What's a recent moment that made it feel worth it? ·
16. Is there a path you almost took instead? · 17. What do you miss about being my
age? · 18. How do I know if this career is right for me?

## 2. Participant experience & fatigue management

- **Landing page** is minimal-first: hero only; "How it works" (steps with
  per-stage times + about-the-study) opens on demand. Time framing follows the
  fatigue principle: per-stage durations first, the ~1-hour total second, then the
  explicit reassurance that breaks are built in and the page can be closed and
  resumed without losing anything. The single "~50–60 minute session" badge
  (perceived as intimidating) is gone; the v5.1 chip "A conversation with your
  future self" stays.
- **Comfort defaults**: reading font Sans, text size at maximum (A+++); both remain
  participant-adjustable. The comfort panel is always closable (it previously could
  cover its own button).
- **Survey readability**: item text leads at a clearly larger size than response
  chrome; legends/hints lightened; blocks given air. The IOS instruction's key
  phrase is emphasized in capitals (CLOSE AND OVERLAPPING) to match the FSCS items
  — typographic emphasis only; instrument wording, scales and anchors untouched.
  Second pass (same day): every survey page opens with a real serif heading and
  the task instruction in body ink, giving each page an unmistakable reading
  entry point.
- **Latency honesty**: after ~9 s of waiting the typing indicator adds "Taking a
  moment — a thoughtful reply can take a little while." (calm, no pressure cues).
- **Free continuation** now *shows* the full stage-C conversation above a "Your
  conversation continues" divider — §3.9b's "same conversation continuing" is now
  visually true. Logging separation unchanged (free turns recorded separately,
  outside the main analysis).

## 3. Measurement & data integrity (what did NOT change)

Instrument wording, scales, anchors, item order (TIPI-10, O*NET values, RIASEC,
IOS, FSCS-2, vividness ×4, CDSE-SA, CIP-CCA, manipulation checks, open-ended ×2);
profile-isolation rule (baseline receives career + location only); consent gating;
time policy (20-min recurring rest, 30-min hard cap, count-up clock only);
no-regenerate; per-turn persistence; Andrea's reflective/direct prompt texts;
CIP-CCA placeholders (still pending verbatim items — unchanged blocker).

## 4. Operations affecting the study

- **Reply truncation fixed** (was: model output silently cut mid-sentence — a
  validity threat for the conversation stimulus). Cause: 1024-token cap counting
  gpt-5.1's hidden reasoning tokens; now env-configurable, default 16384, with
  truncation logging.
- **Cross-device resume** (researcher tool): any session can be continued from the
  admin dashboard via a resume link; the run is rebuilt from the database on any
  device and an interrupted role-play is replayed into the model so the future
  self keeps its memory. *Analysis note:* resumed runs restart `durationSec` at
  the resume point; `turnCount` is cumulative; transcripts are cumulative.
- **Database misconfiguration diagnosed and RESOLVED** (2026-06-11 evening): the
  live `DATABASE_URL` pointed at localhost; Kangzhi set it to the
  `${{Postgres.DATABASE_URL}}` reference. `/healthz` now shows `"db": true`;
  sessions persist; the full admin surface (list, detail, exports, descriptives,
  resume links) verified against real data.
- **Credential hygiene**: `ADMIN_TOKEN`, `RESULTS_TOKEN` and the Postgres password
  have each appeared in chat during development — rotate all three before
  fielding (also a v4.1 §6 requirement post-study).

## 5. Verification (2026-06-11)

End-to-end headless flow test, reconstruction test and admin-gate test green after
every batch; a Playwright walkthrough screenshots the entire participant flow
(desktop + mobile) after every batch; live deployed probes measured reply length in
both conditions (strict rule: every reply 2 paragraphs, 89–163 words, none
truncated; relaxed rule re-probed after deployment), time-anchored advice, and the
resume welcome-back path.
