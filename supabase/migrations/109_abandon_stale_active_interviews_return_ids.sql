-- Extend abandon_stale_active_interviews to return transitioned row identities
-- so the cron path can attempt durable interview_abandoned milestones (app-side).
-- Migration 108 remains untouched (integer return). This replaces the function
-- signature — Postgres requires DROP when the return type changes.
-- No product_events inserts here. No credit changes.

DROP FUNCTION IF EXISTS public.abandon_stale_active_interviews();

CREATE FUNCTION public.abandon_stale_active_interviews()
RETURNS TABLE (
  interview_id UUID,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_stale_before TIMESTAMPTZ := NOW() - INTERVAL '45 minutes';
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT i.id
    FROM public.interviews AS i
    WHERE i.engine = 'v2.1'
      AND i.status IN ('pending', 'in_progress')
      AND public.interview_last_activity_at(i.id) < v_stale_before
    FOR UPDATE OF i SKIP LOCKED
  )
  UPDATE public.interviews AS i
  SET
    status = 'abandoned',
    completed_at = COALESCE(i.completed_at, NOW())
  FROM candidates AS c
  WHERE i.id = c.id
    AND i.engine = 'v2.1'
    AND i.status IN ('pending', 'in_progress')
    AND public.interview_last_activity_at(i.id) < v_stale_before
  RETURNING i.id, i.user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.abandon_stale_active_interviews()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.abandon_stale_active_interviews()
  TO service_role;

COMMENT ON FUNCTION public.abandon_stale_active_interviews() IS
  'Abandon V2.1 pending/in_progress interviews whose last activity is older than 45 minutes. Returns (interview_id, user_id) for each transitioned row. Stale predicate re-checked on UPDATE. No credit change. No product_events write. Service-role only.';
