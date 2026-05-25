-- InterviewEra — Founder Feedback Pipeline
-- Adds the `feedbacks` table: durable store for in-app feedback submissions.
-- The founder also receives every submission by email (see src/lib/email/feedback-notification.ts);
-- this table backs historical analytics so the email is not the only record.
--
-- Writes flow exclusively through the service-role API route (/api/feedback).
-- FK targets public.users (matching 001..025). user_id is nullable + ON DELETE SET NULL
-- so deleting an account preserves the feedback record for analytics.

BEGIN;

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Submitter identity (captured at submit time; denormalized so it survives account deletion).
  name  TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),

  -- Structured ratings/answers.
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  liked_text     TEXT NOT NULL DEFAULT '' CHECK (char_length(liked_text) <= 2000),
  confusion_text TEXT NOT NULL DEFAULT '' CHECK (char_length(confusion_text) <= 2000),
  bugs_text      TEXT NOT NULL DEFAULT '' CHECK (char_length(bugs_text) <= 2000),
  would_use_again BOOLEAN,

  -- Context for triage.
  page_url     TEXT NOT NULL DEFAULT '' CHECK (char_length(page_url) <= 2048),
  browser_info TEXT NOT NULL DEFAULT '' CHECK (char_length(browser_info) <= 512),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics: list newest first, filter by rating, and pull a user's own history.
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON public.feedbacks(rating);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id
  ON public.feedbacks(user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.feedbacks IS
  'In-app feedback submissions. Mirror of the founder notification email; backs future analytics.';

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Owners may read their own submissions. All inserts happen via service role
-- (the API route validates + sanitizes); no client-side insert policy is granted.
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedbacks_select_own" ON public.feedbacks;
CREATE POLICY "feedbacks_select_own" ON public.feedbacks
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Role grants (matching 001_initial_schema.sql pattern) ──────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedbacks TO service_role;
GRANT SELECT ON public.feedbacks TO authenticated;

COMMIT;
