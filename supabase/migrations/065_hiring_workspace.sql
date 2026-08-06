-- ============================================================
-- Migration 065 — Hiring Teams workspace (orgs + pipeline candidates)
-- Additive only. RLS + table GRANTs in the same file (033 lesson).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.hiring_organizations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  admin_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_size  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hiring_organizations_admin_user_id_unique UNIQUE (admin_user_id)
);

CREATE INDEX IF NOT EXISTS idx_hiring_organizations_admin
  ON public.hiring_organizations (admin_user_id);

CREATE TABLE IF NOT EXISTS public.hiring_candidates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.hiring_organizations(id) ON DELETE CASCADE,
  full_name   text        NOT NULL,
  email       text,
  role_title  text,
  stage       text        NOT NULL DEFAULT 'applied'
    CHECK (stage IN (
      'applied',
      'ai_interview_completed',
      'shortlisted',
      'human_interview',
      'offer',
      'rejected'
    )),
  score       numeric(4, 1),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hiring_candidates_org
  ON public.hiring_candidates (org_id);

CREATE INDEX IF NOT EXISTS idx_hiring_candidates_org_stage
  ON public.hiring_candidates (org_id, stage);

ALTER TABLE public.hiring_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiring_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hiring_admin read own org" ON public.hiring_organizations;
CREATE POLICY "hiring_admin read own org"
  ON public.hiring_organizations
  FOR SELECT
  USING (admin_user_id = auth.uid());

DROP POLICY IF EXISTS "hiring_admin manage own candidates" ON public.hiring_candidates;
CREATE POLICY "hiring_admin manage own candidates"
  ON public.hiring_candidates
  FOR ALL
  USING (
    org_id IN (
      SELECT id FROM public.hiring_organizations
      WHERE admin_user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM public.hiring_organizations
      WHERE admin_user_id = auth.uid()
    )
  );

GRANT SELECT ON public.hiring_organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hiring_candidates TO authenticated;

GRANT ALL ON public.hiring_organizations TO service_role;
GRANT ALL ON public.hiring_candidates TO service_role;

COMMIT;
