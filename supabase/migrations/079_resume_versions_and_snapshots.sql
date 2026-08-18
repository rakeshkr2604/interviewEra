-- ============================================================================
-- Migration: 20260718000001_resume_versions_and_snapshots.sql
--
-- Purpose: Resume Workspace rebuild — immutable versions + interview snapshots.
-- Additive only. Existing resumes.parsed_data / status / file_url remain valid.
-- Apply via Supabase Dashboard → SQL Editor (Management API token unavailable).
--
-- Backfill: one resume_versions row (v1, source=backfill) per existing resume
-- that has any content; set current_version_id; mark latest parsed resume
-- per user as is_primary.
-- ============================================================================

BEGIN;

-- ── resumes: new columns (nullable / defaults keep existing rows valid) ──────

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS profile_group TEXT NULL;

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS storage_path TEXT NULL;

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS latest_upload_id UUID NULL;

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'uploaded';

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS current_version_id UUID NULL;

ALTER TABLE public.resumes
  DROP CONSTRAINT IF EXISTS resumes_lifecycle_status_check;
ALTER TABLE public.resumes
  ADD CONSTRAINT resumes_lifecycle_status_check
    CHECK (lifecycle_status IN (
      'uploaded',
      'parsing',
      'parse_failed',
      'review_ready',
      'verified',
      'deleted'
    ));

COMMENT ON COLUMN public.resumes.profile_group IS
  'Reserved for future multi-track resumes; unused in V1.';
COMMENT ON COLUMN public.resumes.latest_upload_id IS
  'Write-generation token: parse commits only when upload_id still matches.';
COMMENT ON COLUMN public.resumes.lifecycle_status IS
  'Workspace lifecycle; legacy resumes.status kept in sync for old clients.';

-- Sync lifecycle from legacy status for rows still at default
UPDATE public.resumes
SET lifecycle_status = CASE status::text
  WHEN 'uploading' THEN 'uploaded'
  WHEN 'parsing' THEN 'parsing'
  WHEN 'parsed' THEN 'review_ready'
  WHEN 'failed' THEN 'parse_failed'
  ELSE lifecycle_status
END
WHERE lifecycle_status = 'uploaded'
  AND status::text IN ('uploading', 'parsing', 'parsed', 'failed');

-- At most one primary resume per user among non-deleted rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_one_primary_per_user
  ON public.resumes (user_id)
  WHERE is_primary = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resumes_user_active
  ON public.resumes (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── resume_versions (immutable after insert; app never UPDATEs content) ─────

CREATE TABLE IF NOT EXISTS public.resume_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id       UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  upload_id       UUID NULL,
  source          TEXT NOT NULL,
  parser_version  TEXT NULL,
  storage_path    TEXT NULL,
  file_url        TEXT NULL,
  raw_text        TEXT NULL,
  parsed_data     JSONB NOT NULL DEFAULT '{}'::jsonb,
  skills_extracted JSONB NOT NULL DEFAULT '[]'::jsonb,
  jd_text_hash    TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT resume_versions_source_check
    CHECK (source IN ('upload', 'user_correction', 'backfill')),
  CONSTRAINT resume_versions_version_positive
    CHECK (version_number >= 1),
  CONSTRAINT resume_versions_resume_version_unique
    UNIQUE (resume_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_versions_upload_id
  ON public.resume_versions (resume_id, upload_id)
  WHERE upload_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_created
  ON public.resume_versions (resume_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resume_versions_user
  ON public.resume_versions (user_id, created_at DESC);

COMMENT ON TABLE public.resume_versions IS
  'Immutable resume versions. Editing = insert new row; never mutate parsed_data.';

-- FK from resumes.current_version_id (deferred so backfill can set both sides)
DO $$ BEGIN
  ALTER TABLE public.resumes
    ADD CONSTRAINT resumes_current_version_id_fkey
    FOREIGN KEY (current_version_id)
    REFERENCES public.resume_versions(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resume_versions_select_own ON public.resume_versions;
CREATE POLICY resume_versions_select_own ON public.resume_versions
  FOR SELECT
  USING (
    resume_id IN (SELECT id FROM public.resumes WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS resume_versions_service_role_full ON public.resume_versions;
CREATE POLICY resume_versions_service_role_full ON public.resume_versions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON public.resume_versions TO authenticated;
GRANT ALL ON public.resume_versions TO service_role;

-- ── resume_interview_snapshots (full frozen content, not just a version FK) ─

CREATE TABLE IF NOT EXISTS public.resume_interview_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id       UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  resume_id          UUID NOT NULL REFERENCES public.resumes(id) ON DELETE NO ACTION,
  resume_version_id  UUID NULL REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  parsed_data        JSONB NOT NULL,
  skills_extracted   JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_text           TEXT NULL,
  parser_version     TEXT NULL,
  jd_text_hash       TEXT NULL,
  source             TEXT NOT NULL DEFAULT 'version',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT resume_interview_snapshots_interview_unique UNIQUE (interview_id),
  CONSTRAINT resume_interview_snapshots_source_check
    CHECK (source IN ('version', 'live_fallback'))
);

CREATE INDEX IF NOT EXISTS idx_resume_interview_snapshots_resume
  ON public.resume_interview_snapshots (resume_id);

COMMENT ON TABLE public.resume_interview_snapshots IS
  'Frozen resume content at interview start. Turn/report paths must read this, not live resumes.';

ALTER TABLE public.resume_interview_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resume_interview_snapshots_select_own ON public.resume_interview_snapshots;
CREATE POLICY resume_interview_snapshots_select_own ON public.resume_interview_snapshots
  FOR SELECT
  USING (
    interview_id IN (SELECT id FROM public.interviews WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS resume_interview_snapshots_service_role_full ON public.resume_interview_snapshots;
CREATE POLICY resume_interview_snapshots_service_role_full ON public.resume_interview_snapshots
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON public.resume_interview_snapshots TO authenticated;
GRANT ALL ON public.resume_interview_snapshots TO service_role;

-- ── Backfill: synthesize version 1 from existing resume content ─────────────

INSERT INTO public.resume_versions (
  resume_id,
  user_id,
  version_number,
  upload_id,
  source,
  parser_version,
  storage_path,
  file_url,
  raw_text,
  parsed_data,
  skills_extracted,
  created_at
)
SELECT
  r.id,
  r.user_id,
  1,
  NULL,
  'backfill',
  'parse-v1',
  r.storage_path,
  r.file_url,
  r.raw_text,
  COALESCE(r.parsed_data, '{}'::jsonb),
  '[]'::jsonb,
  r.created_at
FROM public.resumes r
WHERE NOT EXISTS (
  SELECT 1 FROM public.resume_versions v WHERE v.resume_id = r.id
)
AND (
  r.parsed_data IS NOT NULL
  OR (r.raw_text IS NOT NULL AND length(trim(r.raw_text)) > 0)
  OR r.file_url IS NOT NULL
);

UPDATE public.resumes r
SET current_version_id = v.id
FROM public.resume_versions v
WHERE v.resume_id = r.id
  AND v.version_number = 1
  AND r.current_version_id IS NULL;

-- Designate one primary per user: latest parsed (else latest) non-deleted resume
WITH ranked AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE WHEN status::text = 'parsed' THEN 0 ELSE 1 END,
        created_at DESC
    ) AS rn
  FROM public.resumes
  WHERE deleted_at IS NULL
)
UPDATE public.resumes r
SET is_primary = true
FROM ranked
WHERE r.id = ranked.id
  AND ranked.rn = 1
  AND r.is_primary = false
  AND NOT EXISTS (
    SELECT 1 FROM public.resumes x
    WHERE x.user_id = r.user_id
      AND x.is_primary = true
      AND x.deleted_at IS NULL
  );

COMMIT;
