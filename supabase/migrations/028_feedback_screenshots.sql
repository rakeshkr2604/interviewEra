-- InterviewEra — Feedback screenshot attachments
-- Adds a private Storage bucket for feedback screenshots and a screenshot_url
-- column on feedbacks. Uploads happen client-side via short-lived SIGNED UPLOAD
-- URLs minted by /api/feedback/screenshot (auth required), so anonymous uploads
-- are impossible. The bucket's allowed_mime_types + file_size_limit are the
-- server-side enforcement point for type/size (Supabase rejects violations).

BEGIN;

-- ─── Private bucket (png/jpg/jpeg/webp, ≤5 MB) ──────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  5242880, -- 5 MiB
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── feedbacks.screenshot_url ───────────────────────────────────────────────
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT
    CHECK (screenshot_url IS NULL OR char_length(screenshot_url) <= 2048);

COMMENT ON COLUMN public.feedbacks.screenshot_url IS
  'Long-lived signed URL to the attached screenshot in the feedback-screenshots bucket. NULL when none.';

-- ─── Storage RLS (defense in depth) ─────────────────────────────────────────
-- Signed upload URLs are minted by the service role and carry their own auth,
-- but these policies document intent and constrain any direct authenticated
-- access to the user's own folder: feedback/{auth.uid()}/...
DROP POLICY IF EXISTS "storage_feedback_screenshots_insert_own" ON storage.objects;
CREATE POLICY "storage_feedback_screenshots_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND (storage.foldername(name))[1] = 'feedback'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_feedback_screenshots_select_own" ON storage.objects;
CREATE POLICY "storage_feedback_screenshots_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

COMMIT;
