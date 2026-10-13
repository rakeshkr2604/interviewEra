-- 116: Dashboard-adjacent indexes + remaining auth RLS init-plan rewrites.
--
-- Problem:
--   Production Performance Advisor (2026-10-13) reported 5 auth_rls_initplan
--   findings and 11 unindexed foreign keys. Recovery interviews filter by
--   (user_id, engine, status, started_at) without a covering composite.
--
-- This migration:
--   1. Rewrites the five remaining policies so auth.uid()/auth.role() run
--      once per statement via InitPlan. Authorization predicates are unchanged.
--   2. Adds covering indexes for advisor FKs and the recovery interview shape.
--
-- Expected benefit:
--   Lower per-row RLS overhead on interview feedback / diagnostics writes.
--   Faster FK parent lookups / deletes. Recovery LIMIT 1 can use a composite.
--
-- Locking / write overhead:
--   CREATE INDEX IF NOT EXISTS takes a SHARE lock. Tables are low-volume
--   relative to interviews. Not CONCURRENTLY — Supabase migrations run in a
--   transaction (CONCURRENTLY would fail).
--
-- Rollback:
--   Re-create the five policies with bare auth.uid()/auth.role() (not recommended).
--   DROP INDEX IF EXISTS for each idx_* added below.
--
-- Do not apply to production until staging ledger + advisor + EXPLAIN succeed.

BEGIN;

ALTER POLICY interview_feedbacks_select_own
  ON public.interview_feedbacks
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY interview_feedbacks_insert_own
  ON public.interview_feedbacks
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY interview_exit_feedbacks_select_own
  ON public.interview_exit_feedbacks
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY interview_exit_feedbacks_insert_own
  ON public.interview_exit_feedbacks
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY interview_diagnostic_events_service_role
  ON public.interview_diagnostic_events
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE INDEX IF NOT EXISTS idx_interviews_user_engine_status_started
  ON public.interviews (user_id, engine, status, started_at DESC);

DO $$
BEGIN
  IF to_regclass('public.app_error_events') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_app_error_events_user_id
      ON public.app_error_events (user_id);
  END IF;
  IF to_regclass('public.interview_diagnostic_events') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_interview_diagnostic_events_user_id
      ON public.interview_diagnostic_events (user_id);
  END IF;
  IF to_regclass('public.campaign_audit_logs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_campaign_audit_logs_admin_id
      ON public.campaign_audit_logs (admin_id);
  END IF;
  IF to_regclass('public.campaign_codes') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_campaign_codes_created_by
      ON public.campaign_codes (created_by);
  END IF;
  IF to_regclass('public.campus_organization_review_events') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_campus_org_review_events_actor
      ON public.campus_organization_review_events (actor_user_id);
    CREATE INDEX IF NOT EXISTS idx_campus_org_review_events_org
      ON public.campus_organization_review_events (organization_id);
  END IF;
  IF to_regclass('public.marketing_tracking_links') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_tracking_links_created_by
      ON public.marketing_tracking_links (created_by);
  END IF;
  IF to_regclass('public.pricing_campaigns') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_pricing_campaigns_created_by
      ON public.pricing_campaigns (created_by);
    CREATE INDEX IF NOT EXISTS idx_pricing_campaigns_parent
      ON public.pricing_campaigns (parent_campaign_id);
  END IF;
  IF to_regclass('public.technical_failure_cases') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_technical_failure_cases_original_debit
      ON public.technical_failure_cases (original_debit_transaction_id);
    CREATE INDEX IF NOT EXISTS idx_technical_failure_cases_reviewed_by
      ON public.technical_failure_cases (reviewed_by);
  END IF;
END $$;

COMMIT;

-- Post-apply:
--   1. Re-run Performance Advisor. Expected auth_rls_initplan = 0.
--   2. Confirm new indexes exist in pg_indexes.
--   3. EXPLAIN recovery + completed-count queries on a representative user.
--   4. Do not drop advisor-flagged unused indexes from this change set.
