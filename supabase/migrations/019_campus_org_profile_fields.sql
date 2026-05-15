-- ── Migration 019: Add profile fields to campus_organizations ──────────────────
-- Adds contact_email and coordinator_name so T&P officers can set them in Settings.

ALTER TABLE public.campus_organizations
  ADD COLUMN IF NOT EXISTS contact_email      text,
  ADD COLUMN IF NOT EXISTS coordinator_name   text;
