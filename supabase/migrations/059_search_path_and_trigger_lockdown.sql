-- Fix function_search_path_mutable + lock down trigger-only EXECUTE grants
--
-- Part 1 — Security Advisor `function_search_path_mutable` (4 functions):
--   touch_user_progress_updated_at, touch_conversation_states_updated_at,
--   compute_daily_user_rollup, increment_email_metric
--   Pattern matches 015/050/002: SET search_path = public (no body changes).
--
-- Part 2 — Security Advisor anon/authenticated EXECUTE on trigger-only functions:
--   bootstrap_user_progress, guard_users_privileged_update, handle_new_user,
--   sync_college_enrollment_from_progress
--   Pattern mirrors 055_lock_down_anon_callable_functions.sql §3:
--   REVOKE ALL FROM PUBLIC, then FROM anon/authenticated.
--   Triggers invoke these internally — no direct .rpc() callers (grep-verified 2026-07-21).
--
-- Rollback (manual):
--   ALTER FUNCTION public.touch_user_progress_updated_at() RESET search_path;
--   ALTER FUNCTION public.touch_conversation_states_updated_at() RESET search_path;
--   ALTER FUNCTION public.compute_daily_user_rollup(date) RESET search_path;
--   ALTER FUNCTION public.increment_email_metric(text, text) RESET search_path;
--   GRANT EXECUTE ON FUNCTION public.bootstrap_user_progress() TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.guard_users_privileged_update() TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC;
--   GRANT EXECUTE ON FUNCTION public.sync_college_enrollment_from_progress() TO PUBLIC;

BEGIN;

-- ── Part 1: SET search_path on functions missing it ─────────────────────────

ALTER FUNCTION public.touch_user_progress_updated_at()
  SET search_path = public;

ALTER FUNCTION public.touch_conversation_states_updated_at()
  SET search_path = public;

ALTER FUNCTION public.compute_daily_user_rollup(date)
  SET search_path = public;

ALTER FUNCTION public.increment_email_metric(text, text)
  SET search_path = public;

-- ── Part 2: Revoke direct EXECUTE on trigger-only functions ─────────────────
-- Signatures: 015 (bootstrap, touch_*), 016/012 (handle_new_user),
--             048 (sync_college_enrollment), 050 (guard_users_privileged_update).

REVOKE ALL ON FUNCTION public.bootstrap_user_progress() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_users_privileged_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_college_enrollment_from_progress() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.bootstrap_user_progress() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_users_privileged_update() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_college_enrollment_from_progress() FROM anon, authenticated;

COMMIT;
