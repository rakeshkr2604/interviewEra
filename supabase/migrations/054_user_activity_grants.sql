-- ============================================================
-- Migration 054 — service_role GRANTs for user_activity
-- ============================================================
--
-- Migration 024 created user_activity with RLS policies but never granted
-- table-level SELECT/INSERT/UPDATE to service_role. The `GRANT ALL ON ALL
-- TABLES IN SCHEMA public TO service_role` in migration 001 only applies to
-- tables that existed at the time it ran, so every heartbeat upsert and every
-- admin presence read against this table fails with
-- `permission denied for table user_activity` (42501) — RLS never even gets
-- evaluated, since a role needs base table privileges before RLS policies
-- apply. Same root cause as 033 (ai_call_logs), 036 (payments), and 047
-- (lifecycle_email_log).

GRANT SELECT, INSERT, UPDATE ON public.user_activity TO service_role;
