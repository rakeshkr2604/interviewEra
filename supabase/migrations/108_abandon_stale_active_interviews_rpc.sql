-- Proactive stale-active interview cleanup (same 45-minute policy as migration 096).
-- Called by Vercel cron /api/cron/abandon-stale-interviews.
-- No credit changes. Does not touch completed/abandoned rows. V2.1 only.
--
-- Stale predicate is applied on BOTH candidate lock and the authoritative UPDATE
-- so a session that becomes active after selection cannot be abandoned.

CREATE OR REPLACE FUNCTION public.abandon_stale_active_interviews()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_stale_before TIMESTAMPTZ := NOW() - INTERVAL '45 minutes';
  v_count INTEGER := 0;
BEGIN
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
    AND public.interview_last_activity_at(i.id) < v_stale_before;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.abandon_stale_active_interviews()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.abandon_stale_active_interviews()
  TO service_role;

COMMENT ON FUNCTION public.abandon_stale_active_interviews() IS
  'Abandon V2.1 pending/in_progress interviews whose last activity is older than 45 minutes. Stale predicate re-checked on UPDATE. No credit change. Service-role only.';
