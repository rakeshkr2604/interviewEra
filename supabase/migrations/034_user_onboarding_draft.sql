-- Persist /onboarding wizard progress so refresh and viewport changes do not reset the flow.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_draft JSONB;

COMMENT ON COLUMN users.onboarding_draft IS
  'Client onboarding wizard snapshot: step, goal, role, resumeId, jdText, difficulty, etc.';
