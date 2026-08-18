-- Reconcile effects of historical migrations 056-058 after their dependencies.
--
-- 056-058 were manually applied to production before their SQL files entered
-- version control in commit 9fb0864. Their numeric filenames place them before
-- timestamped migrations that create resume versions/snapshots, script tables,
-- answer evaluations, and tool usage events. Fresh Supabase CLI replays must
-- not run the historical bodies early. Those versions are now retained as
-- no-ops; this additive migration establishes their intended final state after
-- every dependency in the current chain exists.
--
-- This migration is idempotent for already-applied environments:
-- - the FK is dropped/recreated with the desired action;
-- - indexes use IF NOT EXISTS;
-- - policy expressions are only altered when an initplan rewrite is needed.

BEGIN;

-- Historical migration 056: resume hard-deletes cascade to frozen snapshots.
ALTER TABLE public.resume_interview_snapshots
  DROP CONSTRAINT IF EXISTS resume_interview_snapshots_resume_id_fkey;

ALTER TABLE public.resume_interview_snapshots
  ADD CONSTRAINT resume_interview_snapshots_resume_id_fkey
  FOREIGN KEY (resume_id)
  REFERENCES public.resumes(id)
  ON DELETE CASCADE;

-- Historical migration 058: FK-supporting indexes.
CREATE INDEX IF NOT EXISTS idx_answer_evaluations_user_id
  ON public.answer_evaluations (user_id);

CREATE INDEX IF NOT EXISTS idx_domain_pack_questions_pack_id
  ON public.domain_pack_questions (pack_id);

CREATE INDEX IF NOT EXISTS idx_email_clicks_user_id
  ON public.email_clicks (user_id);

CREATE INDEX IF NOT EXISTS idx_email_events_user_id
  ON public.email_events (user_id);

CREATE INDEX IF NOT EXISTS idx_email_jobs_event_id
  ON public.email_jobs (event_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_job_id
  ON public.email_logs (job_id);

CREATE INDEX IF NOT EXISTS idx_email_opens_user_id
  ON public.email_opens (user_id);

CREATE INDEX IF NOT EXISTS idx_interviews_resume_id
  ON public.interviews (resume_id);

CREATE INDEX IF NOT EXISTS idx_provider_failover_events_user_id
  ON public.provider_failover_events (user_id);

CREATE INDEX IF NOT EXISTS idx_resume_interview_snapshots_resume_version_id
  ON public.resume_interview_snapshots (resume_version_id);

CREATE INDEX IF NOT EXISTS idx_resumes_current_version_id
  ON public.resumes (current_version_id);

-- Historical migration 057 safety net: rewrite every remaining bare auth.*
-- or current_setting() call in public/storage RLS policy expressions.
CREATE OR REPLACE FUNCTION pg_temp.ie_wrap_rls_initplan(expr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  result text := expr;
BEGIN
  IF result IS NULL THEN
    RETURN NULL;
  END IF;

  result := regexp_replace(
    result,
    'auth\.(uid|role|jwt|email)\s*\(\s*\)',
    '(select auth.\1())',
    'gi'
  );

  result := regexp_replace(
    result,
    '(current_setting\s*\(\s*''[^'']+''\s*(,\s*(true|false))?\s*\))',
    '(select \1)',
    'gi'
  );

  result := regexp_replace(
    result,
    '\(\s*select\s*\(\s*select\s*(auth\.(uid|role|jwt|email)\(\))\s*\)\s*\)',
    '(select \1)',
    'gi'
  );

  result := regexp_replace(
    result,
    '\(\s*select\s*\(\s*select\s*(current_setting\s*\([^)]*\))\s*\)\s*\)',
    '(select \1)',
    'gi'
  );

  RETURN result;
END;
$fn$;

DO $body$
DECLARE
  r record;
  new_using text;
  new_check text;
  sql text;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schemaname,
      c.relname AS tablename,
      p.polname AS policyname,
      pg_get_expr(p.polqual, p.polrelid) AS qual,
      pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'storage')
  LOOP
    new_using := pg_temp.ie_wrap_rls_initplan(r.qual);
    new_check := pg_temp.ie_wrap_rls_initplan(r.with_check);

    IF new_using IS NOT DISTINCT FROM r.qual
       AND new_check IS NOT DISTINCT FROM r.with_check THEN
      CONTINUE;
    END IF;

    sql := format(
      'ALTER POLICY %I ON %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );

    IF r.qual IS NOT NULL THEN
      sql := sql || format(' USING (%s)', new_using);
    END IF;

    IF r.with_check IS NOT NULL THEN
      sql := sql || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE sql;
  END LOOP;
END;
$body$;

DROP FUNCTION IF EXISTS pg_temp.ie_wrap_rls_initplan(text);

COMMIT;
