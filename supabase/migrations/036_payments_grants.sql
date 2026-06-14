-- ============================================================
-- Migration 036 — payments table GRANTs
-- ============================================================
--
-- Migration 035 created public.payments with RLS but omitted table-level
-- GRANTs. The blanket `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role`
-- in 001 only applies to tables that existed when 001 ran — not tables added later
-- (same root cause as 033 for ai_call_logs: PostgreSQL 42501 on INSERT).
--
-- Backend routes (create-order, verify, webhook) use createServiceClient().
-- RLS policies do not widen privileges; service_role still needs INSERT/UPDATE.

GRANT SELECT, INSERT, UPDATE ON public.payments TO service_role;

-- Settings billing history — authenticated users read own rows via RLS policy.
GRANT SELECT ON public.payments TO authenticated;

-- Explicit service_role policy (matches ai_call_logs / user_activity pattern).
DROP POLICY IF EXISTS payments_service_role_full ON public.payments;
CREATE POLICY payments_service_role_full ON public.payments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
