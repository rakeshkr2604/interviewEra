-- 102_drop_legacy_attach_campaign_order.sql
-- Remove the legacy 5-argument attach_campaign_order function so there is a
-- single authoritative campaign-order creation implementation (the 6-argument
-- version from migration 101 that includes p_attribution_snapshot).
--
-- Safety:
--   - No TypeScript callers reference the 5-arg signature post-migration 101.
--   - The 6-arg function has DEFAULT NULL for p_attribution_snapshot, so any
--     call that does not supply that argument still resolves to the 6-arg
--     function and creates rows with attribution_snapshot = NULL.
--   - No financial logic changes — only the duplicate code path is removed.
--
-- Rollback:
--   Re-run migration 084 to restore the 5-arg function (not recommended after
--   migration 101 has been applied to production).

DROP FUNCTION IF EXISTS public.attach_campaign_order(UUID, UUID, TEXT, TEXT, TEXT);
