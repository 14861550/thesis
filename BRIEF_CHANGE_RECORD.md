# Project Status Brief — Living Change Record

Companion to **Project Status Brief v4.1**. Evergreen: every design- or method-level
change since v4.1 is recorded here until folded into a Brief v4.2. Implementation
detail lives in the companion `BUILD_PLAN_CHANGE_RECORD.md`; this file records what
matters for the STUDY — design, stimuli, measurement, ethics, analysis. Maintainer:
Claude Code on behalf of Kangzhi Qin. **Canonical location as of 2026-06-16: repo
`14861550/thesis`, branch `main`** (the team's single working branch; earlier rounds
were authored on the fork `Lumingze13/BachelorThesis` branch `Kaehl` and merged into
`main` on 2026-06-15).

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

### 1.4 Timeline discipline in the role-play (both arms, 2026-06-12)

The future self's invented autobiography must begin at the participant's current
age/study year: every fabricated memory lives inside the ten years between their
present and the bot's present. Events at or before the participant's "now" may
only be referenced through what the participant has shared or through light
generic textures — never as invented specifics, because the participant actually
lived those years (a third-year being told a fabricated "our second year" story
experiences an immersion-breaking contradiction). The baseline, which receives no
profile, keeps all references to the past generic. Live-verified in both arms.

### 1.5 Post-study exploration (new, outside the analysis; 2026-06-12)

After the post-survey the participant reaches a hub with three options: continue
the same conversation, step into a DIFFERENT career (a fresh career-selection
chat followed by a new role-play — repeatable without limit, switchable mid-
conversation), or finish. Everything after the post-survey remains recorded
(under `freeContinuation.explorations`) but is never part of the main analysis;
exploration role-plays run the full main prompt with no time policy. The feature
is announced on the landing "How it works" modal and the pre-post-survey pause.
Rationale: participant value (free exploration as a thank-you) without touching
the measured flow — all instruments are completed before the hub is reachable.

### 1.8 Concrete money answers (both arms, 2026-06-12)

When pay comes up in the stage-C role-play, both arms now answer with concrete,
location-based salary ranges expressed in today's terms and local currency at the
relevant career stages (entry / mid / the future self's level), instead of vague
"it varies" hedging. Realism-floor logic again: honest specificity applied
symmetrically, neither inflating nor dramatising. Live-verified.

### 1.9 Stage-B card rendering hardened (2026-06-12)

The five recommendation cards are parsed from the model's structured block; the
parser previously demanded an exactly-formatted block, and any drift dumped raw
JSON into the participant-visible chat (observed once with the reflective prompt
on gpt-5.1). The extractor is now drift-tolerant (unclosed/missing fences, smart
quotes, surrounding prose) with regression tests, so the card UI — part of the
shared stage-B stimulus — renders reliably in all three rec variants.

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
  entry point. Third pass (2026-06-12): headings centered and oversized
  (30–38 px), and pages shortened to ~5 items each — TIPI split 5+5 (verbatim
  instruction repeated on both pages), circles and vividness separated, CDSE-SA
  and CIP-CCA one page each (pre 9 pages, post 7). Pagination only; every item,
  scale and anchor unchanged.
- **Latency honesty**: after ~9 s of waiting the typing indicator adds "Taking a
  moment — a thoughtful reply can take a little while." (calm, no pressure cues).
- **Free continuation** now *shows* the full stage-C conversation above a "Your
  conversation continues" divider — §3.9b's "same conversation continuing" is now
  visually true. Logging separation unchanged (free turns recorded separately,
  outside the main analysis).

### 1.6 Career lock-in sanity check (2026-06-12)

The stage-B lock-in now model-validates free-typed careers before the role-play
can start: gibberish/jokes ("haha") are rejected with a friendly inline prompt to
name a real career. The check is fail-open (an unreachable validator never blocks
a participant) and is skipped for card-chosen titles, which the model itself
proposed. Closes a validity hole: a nonsense "career" would have produced an
uninterpretable role-play exposure. Applies to the post-study exploration picker
too.

### 1.7 Baseline isolation re-confirmed (2026-06-12, researcher question)

Re-checked against Brief v4.1 §3.3/§3.4 and Build Plan v5.1 §6: the baseline
stage-C bot receives the chosen career + negotiated location and NOTHING else —
no pre-survey answers, no stage-B content. (Both arms experience identical stages
A and B, and the stage-B guide uses the profile in BOTH conditions; the isolation
applies to what the stage-C role-play bot is told.) Rationale in §3.3: profile-
grounding is itself part of the manipulation under test. The deployed code
matches the documents.

## 2a. Researcher tooling (fielding)

- Admin "Recruit" tab (first tab): pick the study cell, batch-mint sequential-PID
  participant links (batches persist in the browser), one link per participant.
- Preview test drive (`?preview=1`): researchers can click through the entire
  flow with nothing saved and all gates skippable — for checking a condition
  before sending links. A visible PREVIEW badge prevents confusion with real
  runs; preview runs cannot contaminate the dataset (no session row is created).
- Refresh-resume continuity: survey page position and both chat conversations
  survive refreshes and redeploys (model history re-seeded server-side).

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
  self keeps its memory.
- **Conversation-time measurement changed** (2026-06-11 late): `durationSec` is
  now ACCUMULATED LIVE TIME — the stage-C clock pauses while the page is hidden
  or closed, while a connection problem blocks replies, and at the hard cap, and
  it continues from the saved value on every resume (same device or another).
  Interruptions no longer consume the participant's 20/30-minute policy window,
  and `durationSec` measures actual conversation exposure rather than wall time.
  `turnCount` and transcripts are cumulative across resumes. Update the v4.2
  measure definitions accordingly.
- **Interruption robustness**: a server restart/redeploy mid-conversation no
  longer breaks or resets anything — the chat silently rebuilds the model session
  from the saved transcript (full memory, no greeting) and continues; the same
  self-healing covers the post-survey free continuation (the "This chat has
  ended" dead-end is gone). Exposure integrity preserved across infrastructure
  events.
- **Fielding workflow**: the admin dashboard gained a Launcher — choose the
  chatbot version (study cell), mint N personal links with sequential participant
  IDs in one click, copy the list, send one link per participant.
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

## 6. Changes landed on `main` by Gleb (2026-06-16) — not yet on Kaehl

These are design-, stimulus- and measurement-level changes a teammate (Gleb Meshkov,
`SkullCandby`, gdmeshkov@gmail.com) pushed to the team repo `14861550/thesis` branch
`main` on 2026-06-16, after the Kaehl→main merge of 2026-06-15. They are not yet on the
`Kaehl` branch. From this date the team works on `main`; this record is maintained
there. Flagged where they bear on Kangzhi's design.

### 6.1 Closeness measure changed — FSCS-2 dropped, single IOS item [FLAG]

Closeness is now measured by the single IOS (Inclusion of Other in the Self) circles
item, pre and post; the 2-item pictorial FSCS-2 continuity pair (similar / connected)
was removed (in-code rationale: Shuai, 14 Jun, "redundant with the IOS item"). This
directly amends §3's "what did NOT change" — which listed IOS + FSCS-2 as untouched —
and one of Kangzhi's three mediators (closeness). It also propagates to Gleb's silicon
self-report and the silicon-cohort validity check (now keyed on `ios_post`). **Confirm
the supervisor decision and update Brief §2.5 (Outcomes / Mediators / Measures) and
Appendix F before fielding.**

### 6.2 New procedure element — future-self imagination gate

A standalone "Picture that future you" page with a 20-second hold now precedes each
closeness (IOS) measure, pre and post, in both arms — a brief structured imagination
prompt immediately before the item. Note for the Method / Procedure section, and a
possible measurement-reactivity consideration (an imagination prompt sits directly
before the closeness rating).

### 6.3 New optional stimulus — "day in the life" video [FLAG]

An optional first-person POV video (or, with no video key, an auto-rotating text
montage) of an ordinary weekday ten years on — generated from the chosen career,
location and Phase-B conversation — can be shown at the Phase B→C handoff, after
lock-in and before the role-play. **OFF by default.** This is a new pre-chat exposure
inserted between phases; the implementing doc itself flags it as a protocol change that
could confound the manipulation. Do not enable for the fielded study without team and
ethics sign-off.

### 6.4 Stage-C reply length now deliberately varied (both arms)

The reply-length guidance changed from a fixed 2-3-paragraph target (§1.2) to
deliberate variation — short answers for light / quick questions, up to 2-3 short
paragraphs for weightier ones, with varied openings. Applied symmetrically, so not a
condition confound, but it supersedes the v4.2 length wording.

### 6.5 Phase B rationale documented; chooser redesigned

A short note answers Shuai's 14 Jun question — why Phase B asks a few open questions
before recommending careers rather than computing them straight from the questionnaire
(the questionnaire is descriptive, not prescriptive; the conversation captures current
wants, surfaces options the student doesn't know exist, grounds geography, and builds
continuity into Phase C). Design rationale only — no method change. The Phase-B career
chooser UI was also redesigned (an in-flow affordance replacing a stranded ghost
button).

### 6.6 Participant copy

AI-sounding headings / intros reworded; the suggested-question ("Ideas to ask") chips
reorganized by theme and sampled across themes (still a fixed pool, identical across
arms — §1.3 unchanged in substance).

*Provenance: all by Gleb Meshkov (`SkullCandby`, gdmeshkov@gmail.com), 2026-06-16,
commits `635dd77`, `5cb3b6c`, `5009ad0`, `29c6164`, `c24802e`.*

## 7. Measurement restructure (2026-06-17, Kangzhi) — supersedes parts of §6

Kangzhi's decisions after reviewing §6. Implemented on `main` (commit `2f4beac`).

### 7.1 Continuity (FSCS) restored — resolves the §6.1 flag

The 2-item pictorial FSCS continuity measure is reinstated (pre + post; continuity =
mean of similarity + connectedness). Continuity is one of the three mediators (H3) and
the channel the biographical-grounding component targets; its 14 Jun removal is
reversed. The three mediators are again each measured: closeness (IOS, 1 item),
continuity (FSCS, 2 items), vividness (4 items).

### 7.2 Distal outcome changed — now CIP-Short "Lack of Readiness" only [VERIFY]

The two former distal outcomes — CDSE-SA (career decision self-efficacy) and CIP-CCA
(choice/commitment anxiety) — are removed. The single distal outcome is now the
**CIP-Short Lack of Readiness** subscale (5 items, 6-point, reverse-scored; higher =
more lack of readiness), pre + post. Method consequences to fold into Brief v4.2:
update §2.5 (measures), §2.6 (H4/H5 now concern lack of readiness, not self-efficacy /
choice anxiety), §4.1 (analysis), and Appendix F. **[VERIFY]** the verbatim item
wording against Xu & Tracey (2017b), J. Counseling Psychology 64, 222–232, before
fielding — the uploaded CIP-Short paper (Xu 2020) gives only abbreviated Table-4 stems,
which the app renders as full items pending confirmation. (Andrea's reserved, disabled
post-survey placeholder still names her own CDSE-SF DV — left untouched.)

### 7.3 Imagination hold removed (skippable) — supersedes §6.2

The 20-second forced hold before the closeness measure is removed; the "Picture that
future you" page is now skippable (the imagination prompt itself remains, optional). No
forced pre-measure reactivity.

### 7.4 "Day in the life" video removed — supersedes §6.3

The optional Phase B→C video stimulus is deleted entirely. There is no pre-chat video
exposure between phases, so the protocol-change / confound concern raised in §6.3 is
moot.

### 7.5 Phase B lock-in UX (no measurement change)

The career lock-in is now a separate full-screen page with a "back to chat" button
rather than an inline panel under the conversation. Participant-experience only.

### 3 (amended) — measurement battery as of 2026-06-17

The instrument list is now: TIPI-10, O*NET Work Values, RIASEC, **IOS (closeness)**,
**FSCS-2 (continuity, restored)**, **vividness ×4**, manipulation checks ×3,
open-ended ×2, and **CIP-Short Lack of Readiness (distal outcome, replaces CDSE-SA +
CIP-CCA)**. CIP-CCA placeholders and the CDSE-SA verification task in §6/earlier are no
longer applicable.

## 8. Session of 2026-06-19 — stimulus integrity, ethics/privacy, researcher tooling

Study-relevant changes from the 2026-06-19 session (branch `claude/sleepy-brown-039dhc`,
merged to `main` + deployed). Implementation detail is in `BUILD_PLAN_CHANGE_RECORD.md`
Round 13 and the `docs/*_to_code_change_record_and_suggestions.docx` §6.

### 8.1 Stage-B direct-arm card integrity (stimulus)

The **direct** arm presents its five career cards in its *opening* turn; a bug had let that
opening leak the raw recommendation JSON into the participant's first chat bubble. Fixed —
the opening is now parsed into cards like any later turn. **Validated on the production model
(gpt-5.1):** exactly five cards every run, the direct (no-exploration-question) manipulation,
ten-year framing, and the geographic-realism location step after the participant settles on a
career — all behave to spec. No prompt change was needed.

### 8.2 De-identified export truly de-identifies (ethics)

The admin "Export de-identified" file now **strips the participant's self-entered name** (it had
been labelled de-identified while still carrying real names). The full identified export is
unchanged for authorised use.

### 8.3 Study-design documents no longer publicly downloadable (ethics / IP)

The production server had been serving `docs/*.docx` — this Brief, the Build Plan, the
change-records — to anyone with the URL. Static serving is now an allowlist, so only the
participant app's assets are public. Relevant to research-IP and pre-registration hygiene.

### 8.4 Researcher fielding — recruiter attribution (no measurement change)

The Recruit tab can now tag each link with **who is handing it out** (Andrea / Thy / Kaehl /
Gleb), shown in the link groups ("sent by X · Y version") and the Sessions list, filterable,
and included in exports — for per-recruiter recruitment tracking. The recruiter is admin-side
metadata only and is **not** in the participant-facing link, so it cannot affect the experience.

### 8.5 Stage-B reflective arm holds its question cap (stimulus fidelity)

Andrea's **reflective** recommendation arm is defined to surface five directions after *3–4*
one-at-a-time reflective questions. On the production model it was overshooting to a 5th question
when a participant answered vaguely — a fidelity drift in the manipulation that the reflective
*process* (not the cards) is meant to deliver. The prompt now enforces a **hard ceiling of at most
four questions**, with explicit instruction that vague answers are normal and not grounds to keep
probing. Verified on gpt-5.1: 3–4 questions every run even under deliberately uninformative answers.
The **direct** arm (no reflective questioning) is unaffected, so the direct-vs-reflective contrast
is unchanged.

### 8.6 Future-self voice-matching restored (MAIN condition only)

A core closeness mechanism of the **MAIN** future-self role-play is that it mirrors the
participant's own register (COMPONENT 1) — including writing back in all-lowercase to a participant
who texts in all-lowercase. On the production model this had silently stopped working: the future
self was replying in clean, capitalised prose regardless. It is now re-asserted on every MAIN
Phase-C turn and verified bidirectional (lowercase in → lowercase out; formal in → formal out). The
**BASELINE** control is deliberately left without any style instruction, so this *strengthens* the
intended main-vs-baseline difference rather than confounding it. No measurement or instrument change.
