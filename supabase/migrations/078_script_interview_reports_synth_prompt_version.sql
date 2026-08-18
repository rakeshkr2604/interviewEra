-- ============================================================================
-- Migration: 20260717000004_script_interview_reports_synth_prompt_version.sql
--
-- Persist synthesis prompt version as a first-class column (audit parity with
-- answer_evaluations.prompt_version / score-v1.2), not only inside synthesis JSON meta.
-- ============================================================================

BEGIN;

ALTER TABLE script_interview_reports
  ADD COLUMN IF NOT EXISTS synthesis_prompt_version TEXT;

COMMIT;
