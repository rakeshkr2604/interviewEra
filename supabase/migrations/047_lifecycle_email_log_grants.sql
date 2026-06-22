-- ============================================================
-- Migration 047 — lifecycle_email_log GRANTs
-- ============================================================
--
-- Migration 046 created public.lifecycle_email_log but omitted table-level
-- GRANTs. The blanket `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role`
-- in 001 only applies to tables that existed when 001 ran — not tables added later
-- (same root cause as 033 ai_call_logs and 036 payments: PostgreSQL 42501).
--
-- Backend lifecycle logging uses createServiceClient() → PostgREST INSERT/SELECT.
-- RLS is not enabled on this table; missing GRANTs are the sole cause of 42501.
-- service_role bypasses RLS when enabled, but still requires table privileges.

GRANT SELECT, INSERT, UPDATE ON public.lifecycle_email_log TO service_role;
