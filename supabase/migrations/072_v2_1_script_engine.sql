-- ============================================================================
-- Migration: 20260711000001_v2_1_script_engine.sql
--
-- Purpose: Schema additions for the v2.1 turn-by-turn script engine.
--
-- What this migration does:
--   1. Adds 10 new columns to the interviews table (all additive, all nullable
--      or carry safe defaults so existing v1 rows are unchanged).
--   2. Creates the script_turns table to persist every LLM turn of a v2.1
--      interview, including the full llm_output blob, transcripts, and
--      submission metadata.
--   3. Adds indexes on script_turns and on interviews.engine.
--   4. Enables RLS on script_turns with ownership-scoped policies matching
--      the interviews table pattern (auth.uid() → interviews.user_id).
--
-- Backward compatibility:
--   All existing v1 interviews retain engine = 'v1' via column DEFAULT.
--   No existing column is renamed, type-changed, or dropped.
--   The questions / conversation_states / reports tables are untouched.
--
-- Safe to re-run: every statement uses IF NOT EXISTS / idempotent DDL.
-- ============================================================================

BEGIN;

-- ── TASK 1: New columns on interviews ────────────────────────────────────────

-- 1. engine — route/runtime selector; 'v1' for all legacy rows.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS engine TEXT NOT NULL DEFAULT 'v1';

ALTER TABLE interviews
  DROP CONSTRAINT IF EXISTS interviews_engine_check;
ALTER TABLE interviews
  ADD CONSTRAINT interviews_engine_check
    CHECK (engine IN ('v1', 'v2.1'));

-- 2. script_type — which LLM script variant drives this session.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS script_type TEXT DEFAULT NULL;

ALTER TABLE interviews
  DROP CONSTRAINT IF EXISTS interviews_script_type_check;
ALTER TABLE interviews
  ADD CONSTRAINT interviews_script_type_check
    CHECK (script_type IS NULL OR script_type IN ('SCRIPT_H', 'SCRIPT_T', 'SCRIPT_M'));

-- 3. current_turn_index — cached index of the last completed turn for fast resume.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS current_turn_index INTEGER NOT NULL DEFAULT 0;

-- 4. self_intro_enabled — whether the self-intro phase is included in the flow.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS self_intro_enabled BOOLEAN NOT NULL DEFAULT true;

-- 5. last_question_type — tracks last question type for Script M strict alternation.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS last_question_type TEXT DEFAULT NULL;

ALTER TABLE interviews
  DROP CONSTRAINT IF EXISTS interviews_last_question_type_check;
ALTER TABLE interviews
  ADD CONSTRAINT interviews_last_question_type_check
    CHECK (last_question_type IS NULL OR last_question_type IN ('technical', 'behavioral'));

-- 6. skips_used — count of questions the candidate has skipped this session.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS skips_used INTEGER NOT NULL DEFAULT 0;

-- 7. max_skips — maximum skips allowed; set at creation based on difficulty.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS max_skips INTEGER NOT NULL DEFAULT 2;

-- 8. multilingual_detected — set true when STT output contains non-English text.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS multilingual_detected BOOLEAN NOT NULL DEFAULT false;

-- 9. is_returning_user — cached at session creation; true if ≥1 prior completed interview.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS is_returning_user BOOLEAN NOT NULL DEFAULT false;

-- 10. performance_bucket — set at completion; drives closing speech variant selection.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS performance_bucket TEXT DEFAULT NULL;

ALTER TABLE interviews
  DROP CONSTRAINT IF EXISTS interviews_performance_bucket_check;
ALTER TABLE interviews
  ADD CONSTRAINT interviews_performance_bucket_check
    CHECK (performance_bucket IS NULL OR performance_bucket IN ('strong', 'average', 'low'));

-- ── TASK 2: script_turns table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS script_turns (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id      UUID        NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  turn_index        INTEGER     NOT NULL,
  phase             TEXT        NOT NULL,
  is_question       BOOLEAN     NOT NULL DEFAULT false,
  llm_output        JSONB       NOT NULL,
  raw_transcript    TEXT,
  structured_answer JSONB,
  submitted_as      TEXT,
  answer_text       TEXT,
  question_type     TEXT,
  timer_seconds     INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (interview_id, turn_index)
);

ALTER TABLE script_turns
  DROP CONSTRAINT IF EXISTS script_turns_phase_check;
ALTER TABLE script_turns
  ADD CONSTRAINT script_turns_phase_check
    CHECK (phase IN ('warmup', 'self_intro', 'core', 'candidate_questions', 'closing'));

ALTER TABLE script_turns
  DROP CONSTRAINT IF EXISTS script_turns_submitted_as_check;
ALTER TABLE script_turns
  ADD CONSTRAINT script_turns_submitted_as_check
    CHECK (submitted_as IS NULL OR submitted_as IN ('raw', 'structured', 'timeout', 'skipped', 'auto_submit'));

ALTER TABLE script_turns
  DROP CONSTRAINT IF EXISTS script_turns_question_type_check;
ALTER TABLE script_turns
  ADD CONSTRAINT script_turns_question_type_check
    CHECK (question_type IS NULL OR question_type IN ('technical', 'behavioral'));

ALTER TABLE script_turns
  DROP CONSTRAINT IF EXISTS script_turns_timer_seconds_check;
ALTER TABLE script_turns
  ADD CONSTRAINT script_turns_timer_seconds_check
    CHECK (timer_seconds IS NULL OR timer_seconds >= 0);

-- ── TASK 3: Indexes on script_turns ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_script_turns_interview_id
  ON script_turns (interview_id);

CREATE INDEX IF NOT EXISTS idx_script_turns_interview_turn
  ON script_turns (interview_id, turn_index);

CREATE INDEX IF NOT EXISTS idx_script_turns_phase
  ON script_turns (interview_id, phase);

-- ── TASK 4: RLS on script_turns ──────────────────────────────────────────────

ALTER TABLE script_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS script_turns_select_own ON script_turns;
CREATE POLICY script_turns_select_own ON script_turns
  FOR SELECT
  USING (
    interview_id IN (
      SELECT id FROM interviews WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS script_turns_insert_own ON script_turns;
CREATE POLICY script_turns_insert_own ON script_turns
  FOR INSERT
  WITH CHECK (
    interview_id IN (
      SELECT id FROM interviews WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS script_turns_update_own ON script_turns;
CREATE POLICY script_turns_update_own ON script_turns
  FOR UPDATE
  USING (
    interview_id IN (
      SELECT id FROM interviews WHERE user_id = auth.uid()
    )
  );

-- ── TASK 5: Indexes on interviews.engine ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_interviews_engine
  ON interviews (engine);

CREATE INDEX IF NOT EXISTS idx_interviews_engine_user
  ON interviews (user_id, engine);

-- ── Role grants (matching 001/015 pattern) ────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON script_turns TO service_role;
GRANT SELECT, INSERT, UPDATE ON script_turns TO authenticated;

COMMIT;
