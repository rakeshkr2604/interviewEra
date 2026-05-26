-- Migration 030: Add session_context JSONB column to feedbacks table.
--
-- Stores the full technical context collected client-side at submission time:
--
--   Interview session:
--     session_id, interview_role, interview_type, difficulty_level,
--     interview_duration_seconds
--
--   Browser & device:
--     browser_name, os, device_type, screen_size, network_type
--
--   Permissions & capabilities:
--     mic_permission_status, camera_permission_status,
--     speech_recognition_supported, speech_recognition_enabled
--
--   Navigation:
--     current_page
--
-- Stored as JSONB so the schema is forwards-compatible: new client-collected
-- fields appear automatically without requiring further migrations.
--
-- Nullable: older rows and clients that can't collect context stay NULL.
-- No NOT NULL constraint, no default, no check constraint — presence is
-- always optional.

BEGIN;

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS session_context JSONB;

COMMENT ON COLUMN public.feedbacks.session_context IS
  'Technical context collected client-side at feedback submission time: '
  'interview session details, browser/device info, and permission states. '
  'NULL for submissions from clients that do not send this field.';

-- GIN index enables fast JSONB containment queries, e.g.:
--   SELECT * FROM feedbacks WHERE session_context @> '{"device_type": "mobile"}';
--   SELECT * FROM feedbacks WHERE session_context @> '{"mic_permission_status": "denied"}';
-- Only created when the column has data to avoid wasting index space on NULL rows.
CREATE INDEX IF NOT EXISTS idx_feedbacks_session_context
  ON public.feedbacks USING GIN (session_context)
  WHERE session_context IS NOT NULL;

COMMIT;
