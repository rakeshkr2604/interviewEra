-- Migration 106: Add interview_feedbacks table for after-interview session feedback
--
-- Durable store for structured feedback collected immediately after an interview session
-- while the report is generating. Explicitly associated with an interview/session ID.
--
-- Writes flow through service-role API route (/api/interview/feedback).
-- RLS allows owners to read and insert their own interview feedback.

BEGIN;

CREATE TABLE IF NOT EXISTS public.interview_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,

  -- Structured feedback
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  liked_aspect TEXT NOT NULL DEFAULT '' CHECK (char_length(liked_aspect) <= 200),
  issue_type TEXT NOT NULL DEFAULT '' CHECK (char_length(issue_type) <= 200),
  comment TEXT NOT NULL DEFAULT '' CHECK (char_length(comment) <= 2000),

  -- Optional technical device / browser context
  device_info JSONB,

  -- Triage & management (matching platform feedback workflow)
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 5000),

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One feedback submission per interview
  CONSTRAINT interview_feedbacks_interview_id_key UNIQUE (interview_id)
);

-- Indexes for querying by user, interview, date, rating, and triage status
CREATE INDEX IF NOT EXISTS idx_interview_feedbacks_user_id
  ON public.interview_feedbacks(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interview_feedbacks_interview_id
  ON public.interview_feedbacks(interview_id);

CREATE INDEX IF NOT EXISTS idx_interview_feedbacks_created_at
  ON public.interview_feedbacks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_feedbacks_rating
  ON public.interview_feedbacks(rating);

CREATE INDEX IF NOT EXISTS idx_interview_feedbacks_unread
  ON public.interview_feedbacks(created_at DESC)
  WHERE is_read = false AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_interview_feedbacks_unresolved
  ON public.interview_feedbacks(created_at DESC)
  WHERE is_resolved = false AND is_archived = false;

COMMENT ON TABLE public.interview_feedbacks IS
  'Per-interview feedback captured immediately after interview completion during report generation.';

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.interview_feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interview_feedbacks_select_own" ON public.interview_feedbacks;
CREATE POLICY "interview_feedbacks_select_own" ON public.interview_feedbacks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "interview_feedbacks_insert_own" ON public.interview_feedbacks;
CREATE POLICY "interview_feedbacks_insert_own" ON public.interview_feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Role grants ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_feedbacks TO service_role;
GRANT SELECT, INSERT ON public.interview_feedbacks TO authenticated;

COMMIT;
