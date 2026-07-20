-- ============================================================================
-- Migration: 20260720000002_interviews_follow_up_enabled.sql
--
-- Purpose: Persist the adaptive follow-up toggle on v2.1 interviews so the
-- turn route can enforce follow-up caps server-side (not localStorage-only).
--
-- Safe to re-run: IF NOT EXISTS.
-- ============================================================================

BEGIN;

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS follow_up_enabled BOOLEAN NOT NULL DEFAULT true;

COMMIT;
