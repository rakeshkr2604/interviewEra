-- Phase 6C: technical incident reports are not product ratings.
-- Normal feedback keeps the existing required 1–5 half-star contract.

BEGIN;

ALTER TABLE public.feedbacks
  ALTER COLUMN rating DROP NOT NULL;

ALTER TABLE public.feedbacks
  DROP CONSTRAINT IF EXISTS feedbacks_rating_check;

ALTER TABLE public.feedbacks
  ADD CONSTRAINT feedbacks_rating_check
  CHECK (
    rating IS NULL
    OR (
      rating >= 1
      AND rating <= 5
      AND (rating * 2) = trunc(rating * 2)
    )
  );

ALTER TABLE public.feedbacks
  DROP CONSTRAINT IF EXISTS feedbacks_rating_required_for_non_technical_check;

ALTER TABLE public.feedbacks
  ADD CONSTRAINT feedbacks_rating_required_for_non_technical_check
  CHECK (
    rating IS NOT NULL
    OR feedback_category IS NOT DISTINCT FROM 'technical_issue'
  );

COMMENT ON COLUMN public.feedbacks.rating IS
  'Optional only for interview technical issue reports; required for all normal feedback categories.';

COMMIT;
