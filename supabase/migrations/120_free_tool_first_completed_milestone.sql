-- 120_free_tool_first_completed_milestone.sql
-- At-most-once per user "first free-tool operation completed" funnel milestone.
--
-- persistMilestoneEventOnce() treats unique_violation (23505) as "already recorded",
-- mirroring the 052 dedupe indexes. Props hold only { tool } — never resume text,
-- job descriptions, prompts or answers.
--
-- Additive only: no table, RLS or grant changes. product_events stays service-role-write.
--
-- Rollback (manual): DROP INDEX IF EXISTS public.uq_product_events_free_tool_first_completed;

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_events_free_tool_first_completed
  ON public.product_events (event_name, user_id)
  WHERE event_name = 'free_tool_first_completed';

COMMIT;
