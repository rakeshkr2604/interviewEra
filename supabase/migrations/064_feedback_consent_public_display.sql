-- Opt-in consent for publicly displaying feedback (testimonials / marketing).
-- Additive only. Existing rows stay false — never retroactively claim consent.

BEGIN;

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS consent_public_display BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.feedbacks.consent_public_display IS
  'Submitter opted in to public display of this feedback (first name only, never email) on the website or marketing materials. Defaults false; do not backfill true for pre-consent rows.';

CREATE INDEX IF NOT EXISTS idx_feedbacks_consent_public_true
  ON public.feedbacks (created_at DESC)
  WHERE consent_public_display = true;

COMMIT;
