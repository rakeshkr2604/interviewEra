-- Persist onboarding/session personalization alongside interviews for analytics & replay context
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS session_context JSONB NOT NULL DEFAULT '{}'::jsonb;
