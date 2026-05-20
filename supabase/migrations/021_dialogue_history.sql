-- InterviewEra — Conversational Memory Layer
-- Adds a full chronological dialogue transcript to conversation_states so the
-- orchestrator can generate context-aware follow-ups that reference what the
-- candidate actually said earlier (quiz-bot → conversational interviewer).
--
-- Idempotent: safe to re-run. Apply manually in Supabase SQL Editor after 020.

BEGIN;

ALTER TABLE conversation_states
  ADD COLUMN IF NOT EXISTS dialogue_history jsonb DEFAULT '[]'::jsonb;

COMMIT;
