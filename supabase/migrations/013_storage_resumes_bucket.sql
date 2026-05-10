-- InterviewEra: ensure Storage bucket for resume files exists in all environments.
-- Service-role uploads bypass RLS, but the bucket must exist or storage API returns errors
-- (often only visible in production where this migration was never applied).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  true,
  4194304,
  ARRAY['application/pdf', 'text/plain']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
