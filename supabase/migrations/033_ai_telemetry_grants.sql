-- ============================================================
-- Migration 033 — service_role GRANTs for AI telemetry tables
-- ============================================================
--
-- Migration 023 created the AI telemetry tables with RLS policies but never
-- granted table-level INSERT/SELECT to the service_role. The `GRANT ALL ON
-- ALL TABLES IN SCHEMA public TO service_role` in migration 001 only applies
-- to tables that existed at the time it ran, so every fire-and-forget
-- telemetry insert from `recordProviderOutcome` / `logProviderFailover`
-- currently fails with `permission denied for table ai_call_logs` (42501).
--
-- These GRANTs are the proper fix. RLS policies already restrict access to
-- the service role, but a role still needs the underlying table privileges
-- regardless of RLS — RLS narrows access, it never widens it.
--
-- No latency impact (inserts are non-blocking); this fix unblocks provider
-- intelligence scoring and cost dashboards that consume these tables.

GRANT SELECT, INSERT, UPDATE ON public.ai_call_logs              TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.voice_usage_logs          TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.abuse_detection_logs      TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.provider_health_logs      TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.user_ai_usage_rollups     TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.realtime_session_metrics  TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.provider_failover_events  TO service_role;
