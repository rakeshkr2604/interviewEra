-- ============================================================================
-- Migration: 20260715200001_script_turns_submitted_as_corrected.sql
--
-- Purpose: allow submitted_as = 'corrected' (STT cleanup only; not content rewrite).
-- Keeps legacy 'structured' for existing rows.
--
-- Baseline (20260711000001): CHECK allowed
--   raw | structured | timeout | skipped | auto_submit
-- This migration adds: corrected
--
-- Remote status (verified 2026-07-17, service-role PostgREST membership probe):
--   Constraint name script_turns_submitted_as_check is LIVE.
--   Allowed: raw, corrected, structured, timeout, skipped, auto_submit (all UPDATE OK).
--   Rejected: arbitrary string → SQLSTATE 23514 against that constraint name.
--   Therefore remote matches this migration's target, not the 111 baseline.
--   pg_get_constraintdef / schema_migrations could not be read from this machine
--   (Supabase Management API returns 401; no DATABASE_URL). Effect is confirmed;
--   formal migration-history row is unknown — see TECH_DEBT M13.
--
-- Idempotent: safe to re-run (DROP IF EXISTS + ADD). No "DO NOT APPLY" gate —
-- schema effect is already the desired end state.
-- ============================================================================

ALTER TABLE script_turns
  DROP CONSTRAINT IF EXISTS script_turns_submitted_as_check;

ALTER TABLE script_turns
  ADD CONSTRAINT script_turns_submitted_as_check
    CHECK (
      submitted_as IS NULL
      OR submitted_as IN (
        'raw',
        'corrected',
        'structured', -- legacy (pre Phase 1 content-rewrite submissions)
        'timeout',
        'skipped',
        'auto_submit'
      )
    );
