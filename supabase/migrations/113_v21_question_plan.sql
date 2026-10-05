-- ============================================================================
-- Migration: 113_v21_question_plan.sql
--
-- Purpose: Persist a V2.1 core-question plan on the existing questions table.
--
-- V2.1 previously invented each core question inside POST /api/interview/script/turn
-- and never inserted into questions. Historical V1 rows stay untouched:
-- every new column is nullable, and no existing row is updated.
--
-- plan_status NULL  = legacy V1 question (not a V2.1 plan row)
-- plan_status set   = V2.1 planned | asked | skipped core question
--
-- Follow-ups stay on script_turns. They are not plan rows.
-- Interviews already in progress have no plan rows and no session marker,
-- so they keep the previous turn path.
-- ============================================================================

BEGIN;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_type TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS plan_status TEXT,
  ADD COLUMN IF NOT EXISTS grounding JSONB;

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_question_type_check
    CHECK (question_type IS NULL OR question_type IN ('technical', 'behavioral'));

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_difficulty_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_difficulty_check
    CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard'));

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_plan_status_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_plan_status_check
    CHECK (plan_status IS NULL OR plan_status IN ('planned', 'asked', 'skipped'));

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_source_check;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_source_check
    CHECK (
      source IS NULL
      OR source IN ('llm_plan', 'resume_fallback', 'emergency_fallback', 'replacement')
    );

-- V1 rows have NULL plan_status, so duplicate historical order_index values
-- are not affected. V2.1 plan rows cannot share an order inside one interview.
CREATE UNIQUE INDEX IF NOT EXISTS uq_questions_v21_plan_order
  ON public.questions (interview_id, order_index)
  WHERE plan_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_v21_plan_status
  ON public.questions (interview_id, plan_status)
  WHERE plan_status IS NOT NULL;

-- Staging default privileges no longer grant new access implicitly.
-- questions already exists; re-assert service-role writes used by the plan.
GRANT SELECT, INSERT, UPDATE ON TABLE public.questions TO service_role;

COMMIT;
