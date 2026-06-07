# RESULTS_PAGE_PLAN — supervisor-facing `/results` page

> Read-only, anonymized results surface for supervisors. Same Express app, same
> no-build React + CSS palette as `/admin`. **Never breaks the participant flow
> or `/admin`.** Decisions locked in with the author:
> - "real vs simulated" = **full simulated conversations** (silicon participants
>   actually chat with the future-self bot; we compare those transcripts to real
>   ones). Predicted-ratings agreement stays available as the RQ-metrics section.
> - access = **read-only share link** (`RESULTS_TOKEN`), anonymized data only.

## Why this page
Give supervisors one link to see, for the RQ
("how do design choices in an LLM eval pipeline affect agreement with human
evaluation…"): the data collected so far, the agreement metrics, a side-by-side
of LLM-simulated vs real conversations, and every run viewable anonymously.

## What it shows (4 sections / tabs)
1. **Overview — research so far.** N completed sessions (by condition, by chosen
   career), mean pre→post Δ per IBM outcome (continuity / vividness / closeness),
   completion counts. Framed as a pilot (N tiny → descriptive only).
2. **RQ results — judge↔human agreement.** From stored eval-runs: MAE / Spearman ρ
   / QWK / ICC(2,1) per outcome × persona-depth (D0/D2/D3) × prompt-structure,
   plus inter-run SD. **Correctly labeled** (source = DB, model = Sonnet, N) —
   not the synthetic-demo banner.
3. **Real vs simulated — conversations.** A "silicon participant" built from a
   real session's profile chats with the *same* future-self bot the humans used;
   the simulated Phase-C transcript is shown beside that participant's real
   Phase-C transcript. Labeled as illustrative / face-validity, not a finding.
4. **Browse sessions — anonymous.** Every completed session viewable without a
   name (P01, P02…) but with full demographics / scores / both transcripts /
   pre+post answers + Δ.

## Access / auth (read-only share link)
- New `RESULTS_TOKEN` env var. `/results?token=…` sets an httpOnly `results_token`
  cookie (mirrors the admin login pattern). `ADMIN_TOKEN` also grants access.
- All `/api/results/*` are **read-only** and serve **only de-identified** data:
  no delete, no PII export, no run-launch. Even a leaked share link exposes no PII.
- If `RESULTS_TOKEN` is unset → page falls back to admin-only (or 503), never open.

## Privacy
- Reuses `deidentifyStudy` (strips post-survey contact/email, scrubs emails in
  free text + transcripts) and adds **name removal**: `profile.name` → `P0X`.
- Simulated personas are built from `profileData` (demographics, Big Five, RIASEC,
  values, career) — **no name** is included.
- Free-text + transcripts remain best-effort de-identified; README notes manual
  review is required before any real-participant data is shared externally, and
  that real-participant use needs the team's ethics clearance.

## Architecture (grounded in the existing repo)
- **Bot reused exactly.** The simulator calls the same `buildSystemPrompt` /
  `buildBaselinePrompt` (`lib/prompt.js`) + `claude-sonnet-4-6` the humans used,
  so simulated and real conversations face an identical future-self bot.
- **New silicon-participant prompt:** `buildSimulatorPersonaPrompt(profileData)`
  in `lib/prompt.js` — plays the *user*: first-person student voice, traits-driven
  (e.g. high neuroticism → more anxious questions), asks real questions, reacts,
  never reveals it is an AI.
- **Engine:** `lib/simulator.js` →
  `runSimulatedConversation({ profileData, condition, turns, llm })` runs the
  bot↔bot loop and returns a transcript in the exact `[{role,text}]` shape the
  app stores, so the results page renders it with the same chat bubbles. The LLM
  is injectable → the engine is unit-tested offline with a deterministic stub.
- **Async runner + storage:** launched from `/admin` (like eval runs), status
  tracked in a new `simulations` table, transcript written back on completion.

### Data model — new table (idempotent in `db/schema.sql`)
```
simulations(
  id uuid pk, created_at, status (queued|running|done|failed),
  source_type (real|synthetic), source_session_id uuid null → sessions(id),
  persona jsonb,            -- the profileData used (no name)
  config jsonb,             -- { model, turns, condition }
  transcript jsonb,         -- simulated Phase-C [{role,text}]
  error text )
```

### Endpoints
- Admin (gated by `ADMIN_TOKEN`, write): `POST /api/admin/simulations`
  (`{ source_session_id, turns }`), `GET /api/admin/simulations`,
  `GET /api/admin/simulations/:id`.
- Results (gated by `RESULTS_TOKEN`/`ADMIN_TOKEN`, read-only, de-identified):
  `GET /api/results/overview`, `GET /api/results/sessions`,
  `GET /api/results/sessions/:id`, `GET /api/results/runs`,
  `GET /api/results/runs/:id`, `GET /api/results/simulations`,
  `GET /api/results/simulations/:id` (returns sim transcript + the matched
  de-identified real transcript).

## Build phases (verify each)
1. Schema: `simulations` table (auto-migrates on boot via `initSchema`).
2. Simulator: `buildSimulatorPersonaPrompt` + `lib/simulator.js`; **offline unit
   test** of the loop with a stub LLM (transcript shape, alternation, turn count).
3. Read-only `/api/results/*` + `anonymizeStudy`; mount `/results`; static-deny
   the results HTML from the public static handler.
4. `/results` front (4 tabs) + login, in the `/admin` style (Geist / Instrument
   Serif, light+dark).
5. Admin: simulation launch tab + endpoints.
6. Docs/env: `.env.example` + README (`RESULTS_TOKEN`, simulator, deploy,
   key-rotation reminder).

## Honest framing (state to supervisors)
- N is tiny → **everything is descriptive / pilot**; correlations are undefined
  or unstable at N≈1–2.
- Bot↔bot simulated conversations are **illustrative face-validity**, not human
  data and not a validated result.
- Single judge model (Sonnet); persuasiveness not collected by the app.

## Cost & security notes
- Each simulation ≈ `2 × turns` Sonnet calls on the project's API key
  (e.g. turns=5 → ~10 calls). Keep `turns` small for demos.
- **Rotate the previously-exposed `ANTHROPIC_API_KEY`, `DATABASE_URL` password,
  and `ADMIN_TOKEN`**; set a fresh `RESULTS_TOKEN`. Secrets live only in Railway
  env, never in the repo.

## Deploy
One Railway service (Node+Python via nixpacks) already configured. After merge:
`git push` → Railway redeploys → set `RESULTS_TOKEN` in Railway env. Schema
auto-migrates on boot.
