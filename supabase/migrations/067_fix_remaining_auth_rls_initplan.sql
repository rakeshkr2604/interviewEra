-- 067: Fix the five auth RLS init-plan warnings remaining after migration 057.
--
-- This migration changes only how PostgreSQL evaluates auth.uid()/auth.role():
-- once per statement via an InitPlan instead of once per candidate row.
-- Policy names, commands, roles, USING/WITH CHECK logic, grants, and effective
-- authorization remain unchanged.

BEGIN;

ALTER POLICY platform_reward_settings_service
  ON public.platform_reward_settings
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

ALTER POLICY campaign_codes_service
  ON public.campaign_codes
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

ALTER POLICY campaign_redemptions_service
  ON public.campaign_code_redemptions
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

ALTER POLICY "hiring_admin read own org"
  ON public.hiring_organizations
  USING (admin_user_id = (SELECT auth.uid()));

ALTER POLICY "hiring_admin manage own candidates"
  ON public.hiring_candidates
  USING (
    org_id IN (
      SELECT id
      FROM public.hiring_organizations
      WHERE admin_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id
      FROM public.hiring_organizations
      WHERE admin_user_id = (SELECT auth.uid())
    )
  );

COMMIT;

-- Post-apply read-only verification:
--
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND policyname IN (
--     'platform_reward_settings_service',
--     'campaign_codes_service',
--     'campaign_redemptions_service',
--     'hiring_admin read own org',
--     'hiring_admin manage own candidates'
--   )
-- ORDER BY tablename, policyname;
--
-- Re-run Supabase Performance Advisor. Expected auth_rls_initplan warnings: 0.
