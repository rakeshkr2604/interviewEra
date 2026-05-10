-- Optional: allow authenticated users to insert objects under resumes/{auth.uid()}/...
-- The API uses the service role (bypasses RLS); this policy helps future client-side uploads
-- and documents intent. Safe to apply on all environments.

DROP POLICY IF EXISTS "storage_resumes_insert_own_uid" ON storage.objects;
CREATE POLICY "storage_resumes_insert_own_uid"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
