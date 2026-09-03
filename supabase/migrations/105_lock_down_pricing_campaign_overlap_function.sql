-- 105_lock_down_pricing_campaign_overlap_function.sql
-- Remediate Supabase Security Advisor warnings:
--   1. anon_security_definer_function_executable (public.guard_pricing_campaign_overlap())
--   2. authenticated_security_definer_function_executable (public.guard_pricing_campaign_overlap())
--
-- guard_pricing_campaign_overlap() is a trigger-only function (RETURNS TRIGGER) executed
-- by the PostgreSQL trigger engine on BEFORE INSERT OR UPDATE of public.pricing_campaigns.
-- It must not be callable directly via PostgREST / Data API RPC by PUBLIC, anon, or authenticated roles.

BEGIN;

REVOKE EXECUTE
ON FUNCTION public.guard_pricing_campaign_overlap()
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.guard_pricing_campaign_overlap()
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.guard_pricing_campaign_overlap()
FROM authenticated;

COMMIT;
