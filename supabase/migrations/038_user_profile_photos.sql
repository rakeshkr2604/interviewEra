-- InterviewEra — User profile photos
-- Public read bucket (standard avatar CDN pattern). Uploads are minted server-side
-- via /api/account/avatar (auth required); path is stored on users.avatar_path.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_path TEXT
    CHECK (avatar_path IS NULL OR char_length(avatar_path) <= 512);

COMMENT ON COLUMN public.users.avatar_path IS
  'Storage object path in profile-photos bucket, e.g. {user_id}/avatar-{ts}.webp';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  2097152, -- 2 MiB
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "storage_profile_photos_insert_own" ON storage.objects;
CREATE POLICY "storage_profile_photos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_profile_photos_update_own" ON storage.objects;
CREATE POLICY "storage_profile_photos_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_profile_photos_delete_own" ON storage.objects;
CREATE POLICY "storage_profile_photos_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;
