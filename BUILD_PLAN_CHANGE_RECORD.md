# Build Plan — Living Change Record

Companion to **Artifact Build Plan v5.1** (June 10, 2026). Evergreen: every change to
the artifact since v5.1 is recorded here, organized by Build Plan section, until it
is folded into a Build Plan v5.2. Newest entries carry the latest date. Maintainer:
Claude Code on behalf of Kangzhi Qin. Repo `Lumingze13/BachelorThesis`, deploy branch
`Kaehl` (Railway auto-deploys on push).

Status legend: **[DEPLOYED]** live on Railway and verified · **[USER-ORDERED]** an
explicit instruction from Kangzhi that supersedes the v5.1 as-built text.

---

## §6 Conditions / routing

- **(2026-06-11) Default `rec` = `reflective`** [USER-ORDERED] [DEPLOYED]. Andrea's
  reflective prompt is the working stage-B design for ALL cells; Kangzhi's guide is a
  backup selectable via `rec=guide`. Changed in: URL default (`app.jsx readRec`),
  server fallback (`/api/phase-b/session`), prompt selector (`pickPhaseBPrompt`),
  admin link minting default, launcher option order. Allow-list updated:
  `INTENDED = { kangzhi: [reflective×main, reflective×baseline], andrea: [reflective×main, direct×main] }`.
  **Consequence to record in v5.2:** the stage-B location-negotiation step (guide
  Step 4) is no longer in the default flow — location is captured only at the
  lock-in card; the stage-C geographic-realism floor (§11.6) still applies to both
  arms unchanged.

## §7 Session flow

- **(2026-06-11) Screen 0 — landing rebuilt minimal-first** [USER-ORDERED] [DEPLOYED].
  The hero is the whole page. "How it works" (three steps now with per-stage times,
  the neutral pre-chat sentence, Wendelien's Step-03 line verbatim, and the
  about-the-study text) lives in an on-demand modal — nothing explanatory renders
  inline. The duplicate "About the study" nav link and the in-page sections are gone.
  The single "~50–60 minute session" pill (perceived as intimidating) is replaced by
  a calm two-line block: per-stage times first (questionnaire ~10 · choosing ~10–15 ·
  conversation 20–30), total second ("about an hour in all"), then the reassurance
  that breaks are built in and the page can be closed and resumed anytime. The
  v5.1-spec chip "A conversation with your future self" is retained. The header
  button that said "Sign in" (no account system exists) now says "Begin".
  Design rule going forward: all screens stay this minimal — secondary information
  is shown on demand, not inline.
- **(2026-06-11) Screen 7 — chat** [DEPLOYED]:
  - "Ideas to ask" cards replace "suggested first questions until the first send":
    a fixed neutral pool of 18 questions; **4** are offered in a labelled 2×2 card
    grid after EVERY future-self reply; no repeats until the pool recycles; a
    similarity filter (≥3 shared content words) suppresses ideas the participant
    already asked; free typing always available. Deliberately static and identical
    across conditions (no model-generated nudges → no condition confound).
  - The count-up clock renders in the composer footer as well as the header.
  - Restart placement: sidebar "Start over" (desktop) / header ↻ (mobile), both
    confirm-guarded; the floating fab is hidden in chat (it covered the sidebar
    explanation on desktop and the cards row on mobile) and unchanged elsewhere.
  - Typing indicator gains a quiet note after ~9 s ("Taking a moment — a thoughtful
    reply can take a little while.") — reasoning-model latency read as a hang.
- **(2026-06-11) Screen 8 — free continuation now displays the full stage-C
  transcript** read-only (dimmed, "Your conversation continues" divider, auto-scrolled
  to the newest turn) [DEPLOYED]. This implements §7's "full history retained"
  promise, which the old UI did not show. Logging separation unchanged: only new
  free-continuation turns are written to `free_continuation`.

## §8 System prompts (8.2 main / 8.3 baseline — Andrea's 8.4/8.5 untouched)

- **(2026-06-11) Reply-length policy** [USER-ORDERED] [DEPLOYED] — final state after
  two same-day revisions: *"Aim for 2-3 short paragraphs (roughly 80-180 words); a
  fourth only when a scene truly earns it; for multi-part questions answer what you
  can make most vivid and offer to go deeper."* Identical wording intent in both
  arms so reply length is not a condition confound. History: v5.1 said "2-4 short
  paragraphs"; truncation + over-length complaints first led to a hard ≤2¶ /
  60-110-word rule (live-tested), which then proved too terse and was relaxed to the
  comfort rule above.
- **(2026-06-11) Per-call brevity reminder** [DEPLOYED]: `server.js` appends a short
  system message at the END of every phase-c call (recency beats a rule buried in a
  long prompt; live-tested necessity on gpt-5.1). Call-time only — never stored in
  transcripts; phase-B calls (incl. Andrea's prompts) are never touched. v5.2 must
  amend §8's "verbatim, only tokens substituted" line accordingly.
- **(2026-06-11) TIME anchoring (both arms — realism floor)** [USER-ORDERED]
  [DEPLOYED]: prompts are built with the real current date; the bot speaks from
  exactly +10 years and must extrapolate the world plausibly (AI now does much of
  ${today}'s routine knowledge work; advice must fit the future's reality — no
  recommending skills that are being automated away; no sci-fi). Applied to BOTH
  arms for the same reason the geographic-realism floor is both-arms (§11.6): it is
  honesty/realism, not a design component, and an asymmetry would confound the
  comparison.
- **(2026-06-11) Natural questioning** [USER-ORDERED] [DEPLOYED]: KEEP LEARNING
  (main) now requires any question to grow out of the last thing the user said or
  the moment just shared — never an abrupt interview pivot ("What stopped you in the
  past from walking away from something hard?"-style), never a survey-item feel; if
  no question arises naturally, none is asked. PACING ends with "at most one
  question, only when it follows naturally; otherwise end with an opening."
  Baseline carries the same one-natural-question line.

## §11 Conversation behaviour

- **(2026-06-11) §11.2 amendment** [DEPLOYED]: an admin-resumed role-play re-seeds
  the saved transcript into the model history before the next call (see §13a), so
  "one model call per user turn" is preserved but the first call of a resumed run
  replays prior turns plus a resume nudge.

## §12 Model / API

- **(2026-06-11) `LLM_MAX_TOKENS` env (default 16384; was hardcoded 1024)**
  [DEPLOYED]. Root cause of "replies suddenly cut off": gpt-5.1 is a reasoning model
  and hidden reasoning tokens count against the cap, so 1024 truncated visible text
  mid-sentence. The cap is a safety ceiling, not a quality knob — but on reasoning
  models it also bounds thinking, so it is set generously; `finish_reason=length`
  is logged as a warning. `LLM_TIMEOUT_MS` (90 s) bounds runaway calls.

## §13 / §13a Data logging, resume & restart

- **(2026-06-11) Admin-initiated cross-device resume** [USER-ORDERED] [DEPLOYED].
  Every session row in /admin has **Resume** (also in the detail modal, with a
  copy-link button): opens `/?session=<id>&resume=1&cond&rec&study&pid`. The app
  hydrates the run from `GET /api/sessions/:id` (profile, answers, phase B/C,
  post-survey) and lands on the furthest incomplete screen
  (avatar → presurvey → phaseb → roleplay/pause → postsurvey → done). If a
  role-play transcript exists, it is passed as `priorTranscript` to
  `/api/phase-c/session`, replayed into the model history, and the future self
  re-opens with a brief natural welcome-back — full memory, no restart. Autosaved
  transcripts then include the seeded turns (cumulative; no data loss).
  **Analysis note for v5.2:** for resumed runs `durationSec` restarts at the resume
  and `turnCount` counts cumulative user turns.
- localStorage same-device resume-or-restart (§13a) unchanged and still first
  choice for participants; the admin path is for cross-device/laptop-died cases.

## §13b / §14 Production hardening & researcher dashboard

- **(2026-06-11) DB diagnostics** [DEPLOYED]: `describeDbError()` unwraps Node's
  AggregateError into real causes (e.g. `connect ECONNREFUSED 127.0.0.1:5433`);
  `dbHint()` flags an unset or localhost `DATABASE_URL` with the exact Railway fix
  (`${{Postgres.DATABASE_URL}}` reference). `/healthz.db_detail` carries
  `reason + hint`; all admin list/export errors carry `detail + hint`; the dashboard
  shows ONE actionable "Database not connected" banner across tabs instead of
  per-tab "List failed — AggregateError".
- **(2026-06-11) `?token=` links set the auth cookie** [DEPLOYED] for both /admin
  and /results — previously the page loaded but its first API call carried no
  credentials, 401'd, and bounced to the login screen.
- **(2026-06-11) Session detail modal rebuilt** [USER-ORDERED] [DEPLOYED]: wide
  (≤1180 px) modal; header shows rec × cond + pid; action row (Resume ↗ / Copy
  resume link / Download JSON); six panels — profile/choice/scores (incl. location,
  covariates, duration/turns/ended-by), pre-survey (scrollable), phase-B and
  phase-C transcripts (tall scrollers), post-survey (scrollable), free
  continuation; raw JSON collapsed behind a disclosure. Key-value rows wrap instead
  of clipping.
- **(2026-06-11) Admin minting defaults** updated to rec=reflective.

## §16 / §16c UX & cross-browser

- **(2026-06-11) Comfort defaults** [USER-ORDERED] [DEPLOYED]: reading font **Sans**
  (was Serif) and text size **A+++** (max; was A++). Storage key bumped
  (`thesis_comfort_v3`) so existing devices adopt the new defaults; serif and
  smaller sizes remain selectable.
- **(2026-06-11) Comfort panel can always be closed** [DEPLOYED]: the panel now
  opens ABOVE the lifted fab (mirrored `:has()` offsets), the fab z-index sits above
  the panel, and the panel header gained an explicit ✕. Previously the open panel
  covered the fab → unclosable.
- **(2026-06-11) Zoom-aware viewport heights** [DEPLOYED]: comfort sizes use CSS
  `zoom`, which multiplies viewport-unit lengths at render — `100dvh` overflowed by
  the zoom % and scrolled the chat header (with the clock) off-screen. All
  full-height layouts now use `calc(100dvh / var(--zoom, 1))`; chat columns gained
  `min-height: 0` so a long thread can't push the composer below the fold.
- **(2026-06-11) Mobile chat fixed** [DEPLOYED]: the media block hiding the sidebar
  sat BEFORE the base `.chat-side` rule, so the sidebar rendered stacked above the
  chat on every phone (pre-existing); block moved after the base rules. Compact
  mobile header (chip hidden, truncating name/meta, ↻ restart, nowrap Finish).
- **(2026-06-11) Survey readability pass** [USER-ORDERED] [DEPLOYED]: item text
  15.5 px leads; anchors legend 12.5 px / looser leading; hints de-monoed to 12.5 px
  sans; blocks breathe (26 px gaps); choice buttons 14.5 px; scale end-labels wider.
  IOS instruction emphasis "how CLOSE AND OVERLAPPING you feel" now matches the
  FSCS items' capitalization (emphasis only — wording itself unchanged). Circle
  anchors render on one balanced line with a centered legend (the 84 px cap had
  crushed them into word-per-line stacks). Composers auto-grow (1 line → 200 px).
- Circle-pair monotonicity re-verified visually desktop + mobile (smoke item v).

## §17 Runbook

- **(2026-06-11) Visual QA tool**: `test/ui_walk.mjs` (Playwright; mocks all
  /api/*; walks the entire participant flow; 34 screenshots at 1440 px and 390 px).
  Add to the §17-3b smoke checklist; it covers items (v) and (vi).
- **(2026-06-11) Railway DB runbook**: live `DATABASE_URL` was pasted from
  `.env.example` (localhost:5433) → every query failed with AggregateError. Fix: on
  the app service set `DATABASE_URL` to the reference `${{Postgres.DATABASE_URL}}`
  (Variables → Add Reference). Verify `/healthz` shows `"db": true`. Rotate
  `ADMIN_TOKEN`, `RESULTS_TOKEN`, and the DB password before fielding — all have
  appeared in chat.

## Verification log (2026-06-11)

- `npm test` (flow / reconstruct / admin-gate / db) green after every batch; admin
  inline JSX Babel-checked; full-flow UI walkthrough re-run after each batch.
- Live (deployed) measurements, 2 sessions × 2 conditions: with the strict rule all
  replies 2 ¶ / 89–163 words even under a "tell me everything" stress test, none
  truncated, all ending cleanly; relaxed rule re-probed live (skills-advice +
  casual turns) after batch 3.
- Resume probe live: `priorTranscript` seeding returns `resumed: true` plus a short
  in-character welcome-back; admin Resume links hydrate and land correctly.
