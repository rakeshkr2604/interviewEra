-- InterviewEra — Email Preferences Migration
-- Phase 2 Week 9-10: Weekly digest opt-out

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_digest_unsubscribed BOOLEAN NOT NULL DEFAULT false;
