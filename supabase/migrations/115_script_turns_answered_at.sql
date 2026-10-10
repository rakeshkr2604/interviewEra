-- Persist the authoritative candidate answer-submission timestamp on script_turns.
-- Retention uses answered_at − created_at (question presented) for avg duration;
-- interviewer / closing turn created_at must never stand in for answer time.

ALTER TABLE public.script_turns
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

COMMENT ON COLUMN public.script_turns.answered_at IS
  'UTC timestamp when the candidate submitted an answer for this turn (set by /api/interview/script/turn).';

CREATE INDEX IF NOT EXISTS idx_script_turns_interview_answered_at
  ON public.script_turns (interview_id, answered_at)
  WHERE answered_at IS NOT NULL;
