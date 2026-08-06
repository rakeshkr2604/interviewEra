-- Allow half-star feedback ratings (1, 1.5, …, 5).
-- Existing integer rows cast cleanly to NUMERIC(2,1).

BEGIN;

ALTER TABLE public.feedbacks
  DROP CONSTRAINT IF EXISTS feedbacks_rating_check;

ALTER TABLE public.feedbacks
  ALTER COLUMN rating TYPE NUMERIC(2, 1)
  USING rating::numeric(2, 1);

ALTER TABLE public.feedbacks
  ADD CONSTRAINT feedbacks_rating_check
  CHECK (
    rating >= 1
    AND rating <= 5
    AND (rating * 2) = trunc(rating * 2)
  );

COMMIT;
