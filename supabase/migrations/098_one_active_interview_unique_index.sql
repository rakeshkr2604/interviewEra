-- One genuinely active interview per user.
--
-- Must run AFTER 096. Postgres error 55006 forbids CREATE INDEX on interviews
-- in the same transaction as 096's status UPDATEs ("pending trigger events").
-- 096 already abandoned stale/duplicate actives and asserted uniqueness.
-- This file only creates the partial unique index.
--
-- Do not UPDATE interviews in this transaction. Do not DELETE rows.
-- Non-CONCURRENTLY: migrations run inside a transaction.

BEGIN;

DO $$
DECLARE
  v_dup_users INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_dup_users
  FROM (
    SELECT user_id
    FROM public.interviews
    WHERE status IN ('pending', 'in_progress')
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS d;

  IF v_dup_users > 0 THEN
    RAISE EXCEPTION
      'Cannot create uq_interviews_one_active_per_user: % user(s) still have multiple pending/in_progress interviews. Re-apply 096 cleanup first.',
      v_dup_users
      USING ERRCODE = 'P0001';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_interviews_one_active_per_user
  ON public.interviews (user_id)
  WHERE status IN ('pending', 'in_progress');

COMMIT;
