-- Phase 6 — Post-launch growth analytics, experiments, feedback extensions.
-- Additive only; preserves all existing tables and RLS patterns.

BEGIN;

-- ─── Product events (founder funnel + retention dashboard) ───────────────────
CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL CHECK (char_length(event_name) BETWEEN 1 AND 80),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_name_created
  ON public.product_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_user_created
  ON public.product_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_events_created
  ON public.product_events(created_at DESC);

COMMENT ON TABLE public.product_events IS
  'Durable product analytics events mirrored from trackProductEvent(). Backs founder funnel dashboard.';

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- Writes via service role only (API routes / server emitters).
GRANT SELECT, INSERT ON public.product_events TO service_role;

-- ─── Experiment assignments (A/B bucketing) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  experiment_key TEXT NOT NULL CHECK (char_length(experiment_key) BETWEEN 1 AND 64),
  variant TEXT NOT NULL CHECK (char_length(variant) BETWEEN 1 AND 32),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, experiment_key)
);

CREATE INDEX IF NOT EXISTS idx_experiment_assignments_key_variant
  ON public.experiment_assignments(experiment_key, variant);

ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.experiment_assignments TO service_role;
GRANT SELECT ON public.experiment_assignments TO authenticated;

DROP POLICY IF EXISTS experiment_assignments_select_own ON public.experiment_assignments;
CREATE POLICY experiment_assignments_select_own ON public.experiment_assignments
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Feedback growth fields ──────────────────────────────────────────────────
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS nps_score SMALLINT
    CHECK (nps_score IS NULL OR nps_score BETWEEN 0 AND 10);

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS feedback_category TEXT
    CHECK (
      feedback_category IS NULL OR feedback_category IN (
        'general', 'bug', 'feature', 'interview', 'report', 'ai_quality'
      )
    );

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_feedbacks_category_created
  ON public.feedbacks(feedback_category, created_at DESC)
  WHERE feedback_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedbacks_nps
  ON public.feedbacks(nps_score)
  WHERE nps_score IS NOT NULL;

COMMIT;
