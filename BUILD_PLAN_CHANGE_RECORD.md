# Build Plan — Living Change Record

Companion to **Artifact Build Plan v5.1** (June 10, 2026). Evergreen: every change to
the artifact since v5.1 is recorded here, organized by Build Plan section, until it
is folded into a Build Plan v5.2. Newest entries carry the latest date. Maintainer:
Claude Code on behalf of Kangzhi Qin. **Canonical location as of 2026-06-16: repo
`14861550/thesis`, branch `main`** — the team's single working branch (Railway
auto-deploys on push). Earlier rounds were authored on the fork
`Lumingze13/BachelorThesis` branch `Kaehl` and merged into `main` on 2026-06-15.

Status legend: **[DEPLOYED]** live on Railway and verified · **[USER-ORDERED]** an
explicit instruction from Kangzhi that supersedes the v5.1 as-built text.

---

## §6 Conditions / routing

- **(2026-06-19) Andrea's two stage-B core prompts corrected to the confirmed doc**
  [USER-ORDERED]. The `direct` and `reflective` builders (`lib/prompt.js`
  `buildPhaseBDirect` / `buildPhaseBReflective`) now reproduce the two CORE prompts
  verbatim from the confirmed *Prompts for Phase b* document (an earlier add of the
  prompt feature had used the wrong core versions). The study additions are kept on
  top of each, unchanged: the silent `{PROFILE_BLOCK}` is filled from the pre-survey
  (`formatProfile`), and `futureHorizonB()` adds the ten-year-horizon framing for the
  five suggestions. **The stage-B location-negotiation step is now part of the
  confirmed core itself (direct Step 4 / reflective Step 6)** — so location is
  negotiated in-chat for BOTH Andrea arms again (this supersedes the 2026-06-11 note
  below that location had dropped out of the stage-B flow). The `direct` core now
  opens with no confirmation question and a silent five-dimension O*NET scoring pass;
  the `reflective` core uses 3–4 one-at-a-time reflective exchanges before the cards.
  - **(2026-06-19) Citation year corrected to match the confirmed prompt** [USER-ORDERED].
    A faithfulness re-check against the confirmed *Prompts for Phase b* (Project Status
    Brief v4.5 / Artifact Build Plan v5.4) found the only deviation in the restored core
    was the Whole-Person framework citation: both builders read `Liu et al., 2024` where
    the tested prompt says **`Liu et al., 2025`**. Fixed in both `buildPhaseBDirect` and
    `buildPhaseBReflective`; the cores are now verbatim to the confirmed doc.
- **(2026-06-19) Separate results-share token removed** [USER-ORDERED]. The `/results`
  supervisor surface is now gated by `ADMIN_TOKEN` alone (the admin token is enough).
  Dropped: `RESULTS_TOKEN` env handling, the DB-backed `app_config` token +
  `getConfig`/`setConfig`/`getEffectiveResultsToken` (`lib/db.js`), the
  `/api/admin/results-token` route, the admin "Supervisor results link" panel, and the
  `set_railway_results_token.sh` helper. `lib/results_routes.js` now also accepts an
  existing `admin_token` cookie, so a logged-in admin opens `/results` without
  re-entering the token. The view itself is unchanged: still read-only, de-identified,
  and name-stripped (P01…).

## §13b Production hardening — admin / results dashboards

- **(2026-06-19) Recruit links: per-link delete + bulk "delete unused" + duplicate
  guard** [USER-ORDERED]. The Recruit tab listed every minted link with no way to
  remove any, so over-generated test links (and accidental duplicate PIDs) piled up.
  Added: a per-row **×** delete on each link, a per-group **Delete N unused** button
  (only removes links no participant has started — `status='started'` with no career /
  Phase-C turns; links carrying real data are kept and need the louder per-row confirm),
  an **in use** marker on links a participant has started, and an **unused** count in
  each group header. `generate()` now also **skips any PID that already exists** (a Set
  built from the shared rows) so re-running an overlapping range — or two teammates
  minting at once — can no longer create duplicate rows for the same participant ID;
  it reports how many it skipped. All deletes reuse the existing gated
  `DELETE /api/admin/sessions/:id`.
- **(2026-06-19) Admin + results precompiled / vendored like the app** [USER-ORDERED].
  Both dashboards previously loaded React, ReactDOM and Babel-standalone from the unpkg
  CDN and transpiled their inline JSX in the browser. They now follow the participant
  app's pattern: source split out to `admin/admin.jsx` / `results/results.jsx`,
  precompiled by `npm run build` to `admin/admin.js` / `results/results.js` (same
  classic-script IIFE wrapper; `build_sync_test.mjs` guards them against drift), with
  React served from the local `vendor/`. **No runtime Babel and no CDN dependency** to
  load either dashboard. To preserve the gated posture (the HTML is 404'd from static
  and served only behind `ADMIN_TOKEN`), the compiled bundles are served by new gated
  routes `GET /admin/admin.js` (requireAdmin) and `GET /results/results.js`
  (requireResults) and likewise blocked from `express.static` — they never reach an
  unauthenticated client.
- **(2026-06-19) Font CDN hardened on all gated pages** [USER-ORDERED]. The Google
  Fonts stylesheet on `admin/index.html`, `results/index.html` and both login pages now
  loads non-render-blocking (`media="print" onload="this.media='all'"`, with a
  `<noscript>` fallback). With React vendored, a slow or unreachable fonts CDN can no
  longer block or break these surfaces — they render immediately on the system-font
  fallbacks already in the `--font-*` stacks.

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

## Round 4 (2026-06-11, evening) — post-DB-fix verification + refinements

- **§8 TIME anchoring clarified**: the dates in both stage-C prompts are COMPUTED
  AT CONVERSATION TIME — `timeAnchor()` runs `new Date()` inside the prompt
  builders, which execute when each phase-c session is created. Nothing is
  hardcoded: a conversation started in July 2026 says "July 2026 → July 2036";
  one in 2027 says 2027 → 2037. (Documented in-code; the earlier record's
  "June 2026" was an example of the current month, not a constant.)
- **§8 Question bridging strengthened (both arms + per-call reminder)**
  [USER-ORDERED] [DEPLOYED]: a question must be led into by a connecting sentence
  that grows out of the previous thought ("...which is making me wonder —") so it
  reads as caused by the sentence before it; bare/cold questions forbidden.
  Live-verified: replies to "i'm stressed about exams" bridge before asking.
- **§7 Screen 7**: the composer-footer clock is REMOVED again [USER-ORDERED] —
  with the zoom fix the header clock is always visible, and one clock is calmer.
  v5.2 should describe the header clock only.
- **§16 survey hierarchy** [USER-ORDERED] [DEPLOYED]: every survey page now opens
  with a real serif page heading (`.sv-title`, 27 px) and the task instruction in
  body ink (`.sv-instruction`, 15.5 px) instead of a tiny chip + grey line — a
  clear reading entry point (the complaint: "How important is each of these…" was
  grey and easy to miss).
- **§14 admin verified against the live database** (user fixed `DATABASE_URL` →
  `${{Postgres.DATABASE_URL}}`): `/healthz` shows `db: true` (host
  `postgres.railway.internal`, plaintext auto-detected); sessions list/detail,
  JSON export (2 real studies, all 8 sections), descriptives with real means,
  eval-runs and simulations tabs (clean empty states), Resume links — all
  working; the DB banner is gone.

## Round 5 (2026-06-11, late) — robustness: pausable clock, seamless recovery, admin launcher

- **§11.4 Stage-C clock is now ACCUMULATED live time** [USER-ORDERED] [DEPLOYED]:
  it ticks only while the conversation is actually usable — paused while the tab
  is hidden or the page closed, while a connection error blocks replies, while
  connecting, and at the hard cap. `durationSec` + `turnCount` ride with every
  per-turn autosave (the `phase_c` JSONB is replaced whole, so they must), and
  every resume path seeds the clock from the saved value. `durationSec` therefore
  now measures *live conversation time* (pauses excluded) — analysis note for
  v5.2.
- **§11.2/§13a Seamless mid-chat recovery** [DEPLOYED]: the live LLM session is
  in-memory and dies on a server restart/redeploy. `/api/phase-c/session` gained
  a `silentResume` flag — seed the saved transcript into a fresh model session
  with NO LLM call and NO greeting; the chat client auto-rebuilds on
  "Unknown session" and retries the message once, so the participant notices
  nothing (live-verified: the model continued a seeded thread mid-topic).
- **§13a Snapshot resume merges the server row** [DEPLOYED]: "Continue my
  session" now fetches the DB row and prefers its (longer) mid-chat transcript +
  clock over the local snapshot, which never captured mid-role-play state —
  fixes "after a redeploy, resume restarted the timer and cleared the whole
  conversation".
- **§7 Screen 8 free continuation self-heals** [USER-ORDERED] [DEPLOYED]: a
  lost/absent live session (server restart, or a cross-device resume that landed
  past the role-play) silently rebuilds a seeded phase-c session from role-play
  history + free turns; the "This chat has ended — your study session is already
  saved" dead-end is removed.
- **§14 Admin** [USER-ORDERED] [DEPLOYED]: default theme dark (synced with the
  participant app); button polish; new **Launcher tab** — pick the chatbot
  version (the four intended study cells or a custom combo), set count + PID
  prefix/start, mint N participant links in one click (sequential PIDs,
  auto-advancing counter), copy the PID+link list; one link per participant.
  Live-verified by minting and deleting three TST links.
- `lib/sessions.js` rec fallback `guide` → `reflective` (consistency).

## Round 6 (2026-06-12) — timeline discipline, survey pagination/heading, post-study exploration

- **§8 TIMELINE DISCIPLINE (both arms)** [USER-ORDERED] [DEPLOYED]: invented
  memories must be dated AFTER the user's current age/study year (the +10-year
  window); the time before their "now" may only be referenced through what they
  themselves said or light generic textures, never as fabricated specific events
  (a third-year knows what actually happened in year 2 — one contradicting
  "shared memory" shatters the role-play). Baseline (which has no profile) keeps
  every "back then" reference generic and places its invented history strictly
  ahead. Live-verified with a 22-year-old third-year profile: main anchored its
  key memory "the summer between third year and the master"; baseline stayed
  undated and generic.
- **§7/§16 survey pages** [USER-ORDERED] [DEPLOYED]: centered, oversized serif
  page heading (clamp 30-38px) + 16.5px instruction — the page topic is now the
  unmistakable entry point; pages split to ~5 items each (TIPI 5+5 with the
  verbatim original instruction on BOTH pages and "Part 1/2 of 2" eyebrows;
  IOS+FSCS circles and vividness now separate pages; CDSE-SA and CIP-CCA one
  page each). Pre-survey 6 → 9 pages, post-survey 5 → 7. Instruments,
  item wording and order unchanged — pagination and typography only (v5.2 must
  update §7's "6 paged blocks" / §10 page descriptions).
- **§7 Screen 8 → post-study exploration hub** [USER-ORDERED] [DEPLOYED]: the
  post-survey now lands on a hub ("Keep exploring, if you like") with three
  choices — continue the same free conversation, STEP INTO A DIFFERENT CAREER
  (a fresh stage-B pick followed by an exploration role-play; repeatable without
  limit; switchable mid-chat via "Other careers"/"Choose another career"), or
  finish to Closure. Exploration role-plays use the full main prompt for the best
  experience (all measurements are already collected), have no clock and no
  20/30-min caps, and store under `freeContinuation.explorations`
  ({career, location, phaseBTranscript, transcript, durationSec, turnCount, ts})
  — never part of the analysis. The free continuation's "I'm done" returns to
  the hub. The feature is introduced in the landing How-it-works modal and the
  C→post pause copy.
- flow_test/ui_walk page loops are now dynamic (loop while the survey progress
  bar exists) and cover the hub; a dedicated probe walks hub → new career →
  capless exploration chat → back to hub.

## Round 7 (2026-06-12) — career sanity check, preview mode, Recruit tab, resume continuity

- **§7 stage-B lock-in gains a career sanity check** [USER-ORDERED] [DEPLOYED]:
  free-typed careers are judged by the model via the new `/api/validate-career`
  ("haha" can no longer become a future self); an inline hint asks for a re-entry.
  FAIL-OPEN — if the check itself errors, the participant is never blocked.
  Card-chosen titles skip the check (they came from the model). Live-verified:
  "haha"/"asdfgh" rejected with friendly hints; "data analyst"/"marine
  biologist" pass. Note for v5.2 §7: the lock-in is no longer purely client-side.
- **`?preview=1` researcher test drive** [USER-ORDERED] [DEPLOYED]: opened from
  the admin Recruit tab per combination — creates NO session row, performs NO
  autosaves/snapshots, and every gate (consent box, avatar name, all survey
  pages, lock-in) can be skipped unfilled; a persistent PREVIEW badge shows.
  Never sent to participants. Probed: zero API writes across the flow.
- **§14 admin "Launcher" → "Recruit"**, moved first and made the default tab
  [USER-ORDERED] [DEPLOYED]; generated link batches now persist in the browser
  (localStorage) across tab switches and reloads, each with copy-all and remove;
  a "Test drive this version ↗" button opens the selected combo in preview mode.
- **§13a resume continuity completed** [USER-ORDERED] [DEPLOYED]: the paged
  surveys remember their page index across refreshes (answers were restored but
  the page reset to 1 of 9, reading as "starting over"); stage-B chats now
  resume seeded into a fresh model session exactly like stage C (silently, no
  greeting) — a refresh mid-recommendation-chat continues the same conversation.
- **§6 clarification recorded (user question):** baseline profile isolation
  re-verified against both documents — Build Plan §6 "cond=baseline → stage C
  receives the chosen career name + chosen location, and nothing else" (marked
  "the manipulation — do not get this wrong") and Brief §3.3/§3.4 ("does NOT
  receive the pre-survey questionnaire answers, does NOT receive the phase-b
  conversation content… the baseline never receives it in phase c"). Stage A/B
  are identical experiences in both arms and stage B's guide uses the profile
  for BOTH; only the stage-C bot's inputs differ. Code matches the docs; no
  change made.

## Round 8 (2026-06-12) — card-extraction hardening, concrete salaries, preview placeholder

- **Stage-B recommendation extraction rewritten as `lib/recs.js`** [DEPLOYED]:
  the old parser required a perfectly fenced ```json block with strictly valid
  JSON; any model drift (missing closing fence, bare JSON, smart quotes,
  uppercase tag) leaked the RAW JSON into the participant-visible bubble — seen
  live with reflective on gpt-5.1. The extractor now also brace-matches the
  object containing "recommendations", retries with smart-quote normalisation,
  and strips stray fence markers from the visible text. `test/recs_test.mjs`
  covers the drift cases (added to `npm test`). Live re-probe: "give me
  recommendation directly" → 5 cards, no leak.
- **§8 MONEY rule (both arms — realism floor)** [USER-ORDERED] [DEPLOYED]: when
  pay comes up, give concrete location-based salary ranges in today's terms and
  local currency at the relevant career stages, with what moves the number —
  never "it varies". Live-verified (main, Amsterdam, consultant): "in today's
  terms (2026 euros) … 45–60k base as a fresh grad … year 3–5 70–90k…".
- **Preview placeholder career** [DEPLOYED]: a preview test drive that skips the
  career picker now role-plays "Data analyst (preview)" instead of the
  fallback string "this career". The REAL flow cannot reach an empty career —
  the lock-in gate requires a non-empty entry and the model validity check must
  pass — so the placeholder is preview-only by construction.

## Verification log (2026-06-11)

- `npm test` (flow / reconstruct / admin-gate / db) green after every batch; admin
  inline JSX Babel-checked; full-flow UI walkthrough re-run after each batch.
- Live (deployed) measurements, 2 sessions × 2 conditions: with the strict rule all
  replies 2 ¶ / 89–163 words even under a "tell me everything" stress test, none
  truncated, all ending cleanly; relaxed rule re-probed live (skills-advice +
  casual turns) after batch 3.
- Resume probe live: `priorTranscript` seeding returns `resumed: true` plus a short
  in-character welcome-back; admin Resume links hydrate and land correctly.

## Round 9 (2026-06-16) — landed on `main` by Gleb (`SkullCandby`); not authored on Kaehl

These entries record changes a teammate (Gleb Meshkov, `SkullCandby`,
gdmeshkov@gmail.com) pushed directly to the team repo `14861550/thesis` branch `main`
on 2026-06-16, on top of the Kaehl→main merge of 2026-06-15. They are **not on the
`Kaehl` branch**. From this date the team's single working branch is `main`; this
record is maintained there. Status legend for this round: **[ON MAIN]** present on the
team `main` branch · **[FLAG]** needs Kangzhi/team (and where noted supervisor/ethics)
confirmation.

- **§10 Survey — closeness measure changed** [ON MAIN] [FLAG]: the 2-item pictorial
  FSCS-2 continuity pair (similar / connected) was DROPPED; closeness is now the
  single IOS item alone, pre & post. Removed across `survey.jsx`, results aggregation
  (`lib/results_routes.js`), the silicon-cohort validity check (`lib/silicon_cohort.js`
  now keys on `ios_post`), and the silicon self-report. In-code rationale: Shuai's
  14 Jun feedback — FSCS read as redundant with IOS. Pre-survey page count changed and
  the comfort/survey storage key was bumped to `v2` (stale saved page indices reset).
  **This contradicts the "instruments unchanged" line (Brief record §3) and alters one
  of Kangzhi's three mediators — confirm the supervisor decision and update Brief §2.5
  / Appendix F before fielding.** (commit `635dd77`)
- **§7 / §10 New "Picture that future you" imagination page** [ON MAIN]: a standalone
  page with a 20-second hold gate (`PagedSurvey holdSeconds`) now precedes each IOS
  closeness question, pre & post — a brief structured-imagination prompt before the
  measure; the Continue button unlocks only after the hold. (commits `635dd77`,
  `c24802e`)
- **§8 Stage-C reply-length rule rewritten (both arms)** [ON MAIN]: from the Round-5
  fixed "aim for 2-3 short paragraphs (80-180 words)" to "LET IT VARY — the question
  sets the size: a light question gets a sentence or two, a real one up to 2-3 short
  paragraphs; vary how you open; match the user's length and energy; never a wall of
  text." The per-call reminder is kept. Supersedes the Round-5 wording; still symmetric
  across arms (not a condition confound). (commit `635dd77`)
- **§7 Phase B career chooser redesigned** [ON MAIN]: the stranded top-right ghost
  button is replaced with an in-flow affordance ("Choose a career →", reachable from
  the start; a "Seen a direction you would want to live out?" cue once cards exist).
  New `docs/phaseB_qa_rationale.md` documents why Phase B converses before recommending
  (answering Shuai's 14 Jun question) — rationale only, no method change. (commit
  `635dd77`)
- **§7 Suggested "Ideas to ask" chips restructured into themes** [ON MAIN], sampled
  across themes (the Round-6 fixed pool reorganized; still identical across arms).
  (commit `635dd77`)
- **§16 Copy + animation** [ON MAIN]: AI-sounding headings/intros reworded ("Your
  future self, today/now" renamed, templated lines trimmed); the "Picture that future
  you" page animates as a paced fade (each line fades in / holds / out, looping over
  the 20-second hold; honours `prefers-reduced-motion`). (commits `635dd77`, `c24802e`)
- **§NEW Optional "day in the life" POV video at the Phase B→C handoff** [ON MAIN]
  [FLAG]: on career lock-in the app can generate three first-person POV clips
  (morning / afternoon / evening, ten years on) from the career + location + Phase-B
  conversation via Google Veo (Gemini API), played during the B→C pause; a
  rotating-text montage is the fallback when no key is set or a clip is safety-filtered.
  New `lib/video.js` (job store, scene prompts, parallel Veo generation, polling, /tmp
  streaming, TTL cleanup), `lib/prompt.js buildDayInLifeScenePrompt`,
  `server.js /api/day-in-life*`, `dayinlife.jsx`, `app.jsx` wiring at `pause_bc`.
  **OFF by default** (needs `VIDEO_ENABLED` + `GEMINI_API_KEY`); fresh per participant;
  ~3 Veo clips/participant (1-5 min each, real cost). `docs/day_in_life_video.md`.
  **[FLAG: a new pre-chat stimulus between phases — Gleb's own doc notes this is a
  protocol change that could confound the manipulation; keep OFF until the team and
  ethics agree.]** (commits `5cb3b6c`, `5009ad0`, `29c6164`)
- Infra [ON MAIN]: Veo `durationSeconds` coerced to Number (Gemini rejected the
  string); `@google/genai` dependency added; `flow_test` stays green because the video
  step is off by default. (commits `5009ad0`, `5cb3b6c`)

## Round 10 (2026-06-17) — measurement restructure + UI/stimulus cleanup (Kangzhi)

Kangzhi's decisions after reviewing the 14–16 Jun changes; implemented on `main`.
Status: **[ON MAIN]** present on the team `main` branch · **[VERIFY]** needs
verbatim-wording confirmation before fielding. (commit `2f4beac`.)

- **§10 Continuity (FSCS) RESTORED** [ON MAIN] — reverses Round 9's drop. The 2-item
  pictorial FSCS pair (`fscs_similar` / `fscs_connected`, pre + post; continuity =
  mean) is added back: it is the sole measure of the continuity mediator (H3) and of
  what the biographical-grounding component targets, so the 14 Jun removal had left
  continuity unmeasured. `scoreFSCS` + a dedicated circles page (pre and post);
  results aggregation (`lib/results_routes.js`), admin CSV/descriptives, `analysis.py`,
  and the silicon self-report battery (`lib/prompt.js`) all updated to match.
- **§10 Distal outcome swapped — CDSE-SA + CIP-CCA → CIP-Short "Lack of Readiness"**
  [ON MAIN] [VERIFY]: both former distal outcomes removed; replaced by the CIP-Short
  LR subscale (`cip_lr_1..5`, 6-point, ALL reverse-scored → higher = more lack of
  readiness), pre + post, single page. `scoreCipLR` is reverse-aware. Propagated to
  `lib/prompt.js` (silicon self-report), `lib/results_routes.js`,
  `lib/silicon_cohort.js`, `admin/index.html` (CSV + descriptives, reverse noted),
  and `analysis.py`. **[VERIFY — wording]** items render the CIP-Short LR Table-4 stems
  (Xu 2020); confirm verbatim against Xu & Tracey (2017b), J. Counseling Psychology 64,
  222–232, before fielding. (Andrea's disabled `study=andrea` placeholder still names
  her own CDSE-SF DV — left untouched; her instrument, not Kangzhi's outcome.)
- **§7 / §10 Imagination page hold removed (skippable)** [ON MAIN] — reverses Round 9's
  20-second gate. "Picture that future you" no longer forces a wait; Continue is enabled
  immediately (the imagination text/fade stays).
- **§7 Phase B career lock-in → separate full-screen page** [ON MAIN]: the lock-in
  (career + location + familiarity/interest + model validity check) no longer renders
  inline under the chat; it opens as a full-screen overlay (`.pb-lock-overlay` /
  `.pb-lock-sheet`) with a "Back to chat" button — return to tap a suggested card or
  type, then continue. UI only; no measurement change.
- **§NEW "day in the life" video subsystem REMOVED** [ON MAIN] — reverses Round 9's
  video addition. Deleted `dayinlife.jsx`, `lib/video.js`, the `/api/day-in-life*`
  endpoints + import, `buildDayInLifeScenePrompt`, the `@google/genai` dependency (and
  lockfile entry), the `app.jsx` / `index.html` wiring, and the `dil-*` CSS. Pause B→C
  now goes straight to the role-play; the fielded flow has no pre-chat video exposure.
- Plumbing: pre/post page set changed → survey storage key bumped to `thesis_svpage_v3`;
  scoring exports now `scoreCipLR` + `scoreFSCS` (CDSE/CIP removed); `app.jsx` score
  payloads carry `cipLR_pre/post`; `flow_test` drops `dayinlife.jsx`. `npm test`
  (flow / recs / reconstruct) green.

## Round 11 (2026-06-18) — post-conversation imagination prime (Kangzhi)

- **§7 / §10 Post-survey "Picture that future you, once more" page ADDED** [ON MAIN]:
  the post-survey now opens with a structured-imagination page that mirrors the
  pre-survey "Picture that future you" prime, immediately before the post future-self
  measures (IOS / FSCS / vividness). Rationale: the **pre** future-self measures were
  primed by a structured imagination but the **post** measures were not, so pre vs post
  ratings differed in measurement context, not only in the role-play between them — a
  measurement confound on all three mediators. This also makes the Round-9 change-record
  line ("precedes each IOS closeness question, pre & post") true; it had only ever been
  implemented on the pre side. Copy is reworded for *after* the role-play ("the person
  you have just been speaking with", "the work you talked about together") and the page
  is non-blocking (Continue + Skip, no hold gate, no Back into the role-play); nothing on
  it is recorded. `survey.jsx buildPostSections`; survey storage key bumped
  `thesis_svpage_v4 → v5` (stale saved page indices reset). Post-survey is now 8 pages
  (was 7), uniform across all study tags. `npm test` green; full-flow screenshot sweep
  re-run with 0 page errors.

## Round 12 (2026-06-18) — measurement/repo consistency + design-doc audit (Kangzhi)

- **§14b Eval-pipeline FSCS aligned to the fielded 2-item pair** [ON MAIN]: the Python
  eval pipeline still scored continuity over a phantom 3rd FSCS item (`fscs_care`) from
  the initial-commit 3-item scale; Round 10 dropped FSCS to the 2-item Ersner-Hershfield
  pair (`fscs_similar` + `fscs_connected`) everywhere *except* the pipeline. Real sessions
  never carry `fscs_care`, so `loader._mean` averaged two items for real data while
  `synth.py` generated three for synthetic — a silent real-vs-silicon asymmetry. Removed
  `fscs_care`/`fscs_care_post` from `eval_pipeline/{schema,loader,synth}.py`, the
  anti-circularity fixture, and the eval/README + research-plan docs. eval-pipeline pytest
  85 passed.
- **CI now runs the Python eval-pipeline tests** [ON MAIN]: `npm test` exercises no
  Python, which is why the FSCS drift shipped unnoticed; `.github/workflows/ci.yml` gains
  a parallel `pytest` job (setup-python 3.11, `eval_pipeline/requirements.txt`, offline).
- **Survey de-identification widened** [ON MAIN]: `deidentifyStudy()` now scrubs the
  free-continuation + career-exploration transcripts too (it had only scrubbed phase-B/C),
  closing an email-in-free-text leak in de-identified exports and the `/results` view;
  `reconstruct_test` covers it.
- **restart() hardened** [ON MAIN]: clears any versioned `thesis_svpage*` key by prefix
  (was a hardcoded `_v4`), so a Restart can't strand a stale page index after a key bump.
- **CIP comment hygiene** [ON MAIN]: two self-report comments still said "CIP-LR …
  reverse-scored"; corrected to the confirmed two-index forward-scored CIP (`cip_ca`
  commitment anxiety + `cip_cf` confidence, 1–6). Comments only.
- **Design-doc audit** (Build Plan v5.4 / Brief v4.5 / supervisor CIP_outcome_measures):
  the code matches the **confirmed** specs — CIP items/IDs/mixed-order/6-pt/forward-scoring
  and AI-isolation, precompiled (no-CDN) architecture, A+/Cozy/Normal comfort defaults,
  any-major/year/university population (no university field), four AskIdeas chips,
  manipulation checks, 2-item FSCS. Remaining divergences are the planning **docs lagging
  the code**, tracked by the `*_to_code_change_record_and_suggestions` documents. Stale
  PR #2 closed as superseded.
