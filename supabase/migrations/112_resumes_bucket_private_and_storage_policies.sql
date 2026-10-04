-- Make resumes storage private and tighten authenticated object policies.
-- Product download path uses service-role signed URLs (GET /api/resume/:id/file).
-- Object keys are `resumes/{user_id}/{timestamp}.{ext}` (bucket id = resumes).
--
-- Rollback (if needed):
--   UPDATE storage.buckets SET public = true WHERE id = 'resumes';
--   Recreate prior INSERT policies as in 014 / dashboard "Allow authenticated uploads".
-- Apply to staging first; confirm signed downloads still work before production.

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 4194304,
  allowed_mime_types = ARRAY['application/pdf', 'text/plain']::text[]
WHERE id = 'resumes';

-- Loose dashboard policy: any authenticated user could INSERT into any path in the bucket.
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Replace insert policy: own folder under resumes/{uid}/… or legacy {uid}/…
DROP POLICY IF EXISTS "storage_resumes_insert_own_uid" ON storage.objects;
CREATE POLICY "storage_resumes_insert_own_uid"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (
      (storage.foldername(name))[1] = 'resumes'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    )
  )
);

DROP POLICY IF EXISTS "storage_resumes_select_own_uid" ON storage.objects;
CREATE POLICY "storage_resumes_select_own_uid"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (
      (storage.foldername(name))[1] = 'resumes'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    )
  )
);

DROP POLICY IF EXISTS "storage_resumes_update_own_uid" ON storage.objects;
CREATE POLICY "storage_resumes_update_own_uid"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (
      (storage.foldername(name))[1] = 'resumes'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    )
  )
)
WITH CHECK (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (
      (storage.foldername(name))[1] = 'resumes'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    )
  )
);

DROP POLICY IF EXISTS "storage_resumes_delete_own_uid" ON storage.objects;
CREATE POLICY "storage_resumes_delete_own_uid"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR (
      (storage.foldername(name))[1] = 'resumes'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    )
  )
);
