-- Migration 107: Add interview_exit_feedbacks table for incomplete interview exit feedback
--
-- Durable store for structured feedback collected when a candidate leaves an interview
-- before completing it. Explicitly associated with an interview/session ID.
--
-- Writes flow through service-role API route (/api/interview/exit-feedback).
-- RLS allows owners to read and insert their own interview exit feedback.

BEGIN;

CREATE TABLE IF NOT EXISTS public.interview_exit_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,

  -- Structured exit feedback
  exit_reason TEXT NOT NULL CHECK (char_length(exit_reason) <= 200),
  issue_type TEXT NOT NULL DEFAULT '' CHECK (char_length(issue_type) <= 200),
  comment TEXT NOT NULL DEFAULT '' CHECK (char_length(comment) <= 1000),

  -- Progress / Session metadata
  question_index INT,
  progress_percent INT,
  engine TEXT NOT NULL DEFAULT 'script' CHECK (char_length(engine) <= 50),

  -- Optional technical device / browser context
  device_info JSONB,

  -- Triage & management (matching platform & interview feedback workflow)
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 5000),

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One exit feedback submission per interview
  CONSTRAINT interview_exit_feedbacks_interview_id_key UNIQUE (interview_id)
);

-- Indexes for querying by user, interview, date, reason, and triage status
CREATE INDEX IF NOT EXISTS idx_interview_exit_feedbacks_user_id
  ON public.interview_exit_feedbacks(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interview_exit_feedbacks_interview_id
  ON public.interview_exit_feedbacks(interview_id);

CREATE INDEX IF NOT EXISTS idx_interview_exit_feedbacks_created_at
  ON public.interview_exit_feedbacks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_exit_feedbacks_exit_reason
  ON public.interview_exit_feedbacks(exit_reason);

CREATE INDEX IF NOT EXISTS idx_interview_exit_feedbacks_unread
  ON public.interview_exit_feedbacks(created_at DESC)
  WHERE is_read = false AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_interview_exit_feedbacks_unresolved
  ON public.interview_exit_feedbacks(created_at DESC)
  WHERE is_resolved = false AND is_archived = false;

COMMENT ON TABLE public.interview_exit_feedbacks IS
  'Per-interview exit feedback captured when candidates leave an interview before completion.';

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.interview_exit_feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interview_exit_feedbacks_select_own" ON public.interview_exit_feedbacks;
CREATE POLICY "interview_exit_feedbacks_select_own" ON public.interview_exit_feedbacks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "interview_exit_feedbacks_insert_own" ON public.interview_exit_feedbacks;
CREATE POLICY "interview_exit_feedbacks_insert_own" ON public.interview_exit_feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Role grants ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_exit_feedbacks TO service_role;
GRANT SELECT, INSERT ON public.interview_exit_feedbacks TO authenticated;

COMMIT;
