-- Migration 111: retention prune for interview_diagnostic_events

--

-- Adds service-role DELETE + a bounded batch prune RPC.

-- Does not touch interviews, credits, product_events, or other analytics tables.

-- Scheduling: GET /api/cron/prune-interview-diagnostics (CRON_SECRET).



BEGIN;



GRANT SELECT, INSERT, DELETE ON public.interview_diagnostic_events TO service_role;



CREATE OR REPLACE FUNCTION public.prune_interview_diagnostic_events(

  p_retention_days integer DEFAULT 90,

  p_batch_size integer DEFAULT 500

)

RETURNS integer

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

  deleted_count integer;

BEGIN

  IF p_retention_days IS NULL OR p_retention_days < 7 OR p_retention_days > 3650 THEN

    RAISE EXCEPTION 'invalid retention_days';

  END IF;

  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 2000 THEN

    RAISE EXCEPTION 'invalid batch_size';

  END IF;



  WITH doomed AS (

    SELECT id

    FROM public.interview_diagnostic_events

    WHERE recorded_at < NOW() - make_interval(days => p_retention_days)

    ORDER BY recorded_at ASC

    LIMIT p_batch_size

    FOR UPDATE SKIP LOCKED

  )

  DELETE FROM public.interview_diagnostic_events e

  USING doomed

  WHERE e.id = doomed.id;



  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;

END;

$$;



COMMENT ON FUNCTION public.prune_interview_diagnostic_events(integer, integer) IS

  'Deletes interview_diagnostic_events older than retention_days in batches. Diagnostics-only; no interview/credit side effects.';



REVOKE ALL ON FUNCTION public.prune_interview_diagnostic_events(integer, integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.prune_interview_diagnostic_events(integer, integer) FROM anon;

REVOKE ALL ON FUNCTION public.prune_interview_diagnostic_events(integer, integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.prune_interview_diagnostic_events(integer, integer) TO service_role;



COMMENT ON TABLE public.interview_diagnostic_events IS

  'Best-effort interview diagnostics (mic/STT/TTS/API/client failures). Not funnel SoT. Retention: 90d via prune_interview_diagnostic_events + cron.';



COMMIT;
