-- db/schema.sql — study-platform schema (idempotent; safe to re-run on every boot)
--
-- Three tables:
--   sessions   — one row per participant run; JSONB columns mirror the app's
--                `study` object so eval_pipeline's loader reconstructs it 1:1.
--   messages   — flattened, queryable transcript turns (phase b + c).
--   eval_runs  — one row per evaluation-pipeline run launched from the dashboard.

-- gen_random_uuid() is core in PostgreSQL 13+ (Railway runs 16), so no
-- CREATE EXTENSION pgcrypto is needed — and requiring it would fail on roles
-- without CREATE privilege. (db.js applies this file statement-by-statement, so
-- a stray failure here would be non-fatal anyway.)

CREATE TABLE IF NOT EXISTS sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition     text NOT NULL DEFAULT 'main'    CHECK (condition IN ('main','baseline')),
  status        text NOT NULL DEFAULT 'started' CHECK (status IN ('started','in_progress','completed','abandoned')),
  version       text,
  profile       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { demographics, bigFive, values, riasec, year, ... }
  pre_survey    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- raw pre-survey answers (study.preSurvey)
  scores        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { bigFive, riasec, values }
  phase_b       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { career, familiarity, interestStrength, transcript[] }
  phase_c       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { transcript[], durationSec, turnCount }
  post_survey   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- raw post-survey answers (study.postSurvey)
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS sessions_status_idx    ON sessions (status);
CREATE INDEX IF NOT EXISTS sessions_condition_idx ON sessions (condition);
CREATE INDEX IF NOT EXISTS sessions_created_idx   ON sessions (created_at DESC);

-- Two-axis routing (Build Plan §6): `rec` (stage-B prompt) is orthogonal to
-- `condition` (= `cond`, stage-C prompt). `study` is an analysis tag only; `pid`
-- is the researcher-assigned prefixed id (e.g. K017 / A032). `free_continuation`
-- holds the post-survey free chat (same future-self convo continuing; logged
-- separately, NOT in the main analysis — §3.9b). Added idempotently so existing
-- deploys migrate on boot without dropping data.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS rec   text NOT NULL DEFAULT 'guide';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS study text NOT NULL DEFAULT 'kangzhi';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pid   text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS free_continuation jsonb NOT NULL DEFAULT '{}'::jsonb;
-- Recruiter / "sent by": which teammate distributed this link. Orthogonal to the
-- study cell (e.g. Gleb can hand out a link for the shared cell). Admin-set at
-- link creation; null for ad-hoc / self-made sessions.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recruiter text;
CREATE INDEX IF NOT EXISTS sessions_rec_idx   ON sessions (rec);
CREATE INDEX IF NOT EXISTS sessions_study_idx ON sessions (study);
CREATE INDEX IF NOT EXISTS sessions_recruiter_idx ON sessions (recruiter);
CREATE INDEX IF NOT EXISTS sessions_pid_idx   ON sessions (pid);

CREATE TABLE IF NOT EXISTS messages (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  phase       text NOT NULL CHECK (phase IN ('b','c')),
  idx         int  NOT NULL,
  role        text NOT NULL CHECK (role IN ('user','assistant')),
  text        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_session_idx ON messages (session_id, phase, idx);

CREATE TABLE IF NOT EXISTS eval_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { source, depths, prompt_structures, n_runs, model, use_real }
  summary      jsonb,                                -- headline metrics (D0/D2 spearman per outcome, etc.)
  report_path  text,
  report_html  text,
  error        text
);

CREATE INDEX IF NOT EXISTS eval_runs_created_idx ON eval_runs (created_at DESC);

-- simulations — one row per "silicon participant" bot↔bot run. A persona built
-- from a (real or synthetic) profile chats with the SAME future-self bot the
-- humans used; the simulated transcript is compared with the real one on the
-- read-only /results page. No name is stored in `persona`.
CREATE TABLE IF NOT EXISTS simulations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  status            text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  source_type       text NOT NULL DEFAULT 'real'  CHECK (source_type IN ('real','synthetic')),
  source_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  persona           jsonb NOT NULL DEFAULT '{}'::jsonb,  -- profileData used to build the silicon participant (no name)
  config            jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { model, turns, condition }
  transcript        jsonb,                               -- simulated Phase-C transcript [{role,text}]
  error             text
);

CREATE INDEX IF NOT EXISTS simulations_created_idx ON simulations (created_at DESC);
CREATE INDEX IF NOT EXISTS simulations_source_idx  ON simulations (source_session_id);
