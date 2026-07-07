-- Milestone + lifecycle telemetry: exactly-once enforcement at the DB layer.
--
-- Client beacons are fire-and-forget over unreliable mobile networks (sendBeacon
-- retries, duplicate mounts) and server lifecycle emitters run across stateless
-- Vercel serverless instances — an in-process dedupe Set would not survive
-- between concurrent invocations. Postgres is the only place that can actually
-- guarantee "this milestone was recorded at most once per interview."
--
-- Inserts against these partial unique indexes rely on the caller treating a
-- 23505 (unique_violation) as "already recorded", not an error.

-- "First-ever" milestones: exactly one row per interview, regardless of how
-- many times the underlying client/server event re-fires (e.g. avatar_audio_started
-- fires on every question; only the first is persisted as the milestone).
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_events_first_per_interview
  ON public.product_events (event_name, (props->>'interview_id'))
  WHERE event_name IN (
    'interview_first_question_played',
    'interview_mic_blocked',
    'interview_first_answer_blocked',
    'interview_started',
    'interview_completed',
    'interview_abandoned'
  );

-- "Per page-load" milestone: one row per interview + run_id. A genuine reload
-- is a new "open" and should count again; re-renders within one run must not.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_events_session_opened_per_run
  ON public.product_events (event_name, (props->>'interview_id'), (props->>'run_id'))
  WHERE event_name = 'interview_session_opened';
