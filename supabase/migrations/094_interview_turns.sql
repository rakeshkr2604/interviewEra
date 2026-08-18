-- Historical Production apply (Dashboard/MCP), version 20260708174431,
-- name interview_turns, created_by rakesh.kr2604@gmail.com.
-- Never present as a git SQL file; remapped to serial 094 without
-- replaying SQL on Production (table already exists, 80 rows).
-- Staging did not have this schema and must execute this file.
-- Distinct from 072_v2_1_script_engine.sql (that creates script_turns).
-- Body is the stored schema_migrations.statements text, unchanged.

-- Interview turns: per-turn record of the interview loop (phase, LLM response,
-- candidate answer, scoring status) plus new interviews columns for
-- phase-driven script progression.
--
-- Ownership is derived transitively: interview_turns.session_id -> interviews.user_id,
-- matching the 020 conversation_states pattern. Write paths run through
-- service-role API routes; authenticated users get SELECT only.

BEGIN;

-- ─── Part A: interview_turns ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interview_turns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  turn_number       INT NOT NULL,
  phase             TEXT NOT NULL,
  llm_response      JSONB NOT NULL,
  raw_answer        TEXT,
  structured_answer JSONB,
  submitted_as      TEXT,
  answer_status     TEXT NOT NULL DEFAULT 'pending',
  word_count        INT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_turns_session
  ON interview_turns(session_id, turn_number);

ALTER TABLE interview_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own interview turns" ON interview_turns;
CREATE POLICY "Users can view own interview turns"
  ON interview_turns FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM interviews WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON interview_turns TO service_role;
GRANT SELECT ON interview_turns TO authenticated;

-- ─── Part B: interviews — phase-driven script progression columns ──────────

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS script_type           TEXT,
  ADD COLUMN IF NOT EXISTS current_phase         TEXT DEFAULT 'warmup',
  ADD COLUMN IF NOT EXISTS phase_turn_count      INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS question_number       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skips_used            INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_skips             INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS multilingual_detected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_question_type    TEXT,
  ADD COLUMN IF NOT EXISTS performance_score     INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS question_pool         TEXT DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS self_intro_enabled    BOOLEAN DEFAULT true;

COMMIT;
