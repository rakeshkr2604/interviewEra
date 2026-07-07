-- FM-5: Redis-outage degrade path on /api/interview/answer.
--
-- When the rate-limiter backend (Upstash Redis) is unavailable, the answer
-- route no longer 503s (which silently discarded the candidate's answer on
-- mobile clients that don't retry). Instead it saves the answer WITHOUT
-- running the LLM evaluation and marks it pending_backfill. Such answers:
--   - are excluded from the neutral-score backfill at /api/interview/complete
--   - contribute NO score to the report (never a fabricated neutral 5)
--   - are labeled "Answer recorded — evaluation pending" in the report UI
--   - are re-evaluated by scripts/backfill-pending-evaluations.ts once Redis
--     is healthy, which flips the status back to 'evaluated'
--
-- Default 'evaluated' keeps every existing row and every normal-path insert
-- on the legacy semantics (evaluation happens inline at submit time).
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS evaluation_status TEXT NOT NULL DEFAULT 'evaluated'
  CHECK (evaluation_status IN ('evaluated', 'pending_backfill'));

-- The backfill script scans for pending rows; keep that scan cheap without
-- indexing the (overwhelmingly 'evaluated') steady state.
CREATE INDEX IF NOT EXISTS idx_answers_pending_backfill
  ON answers (id)
  WHERE evaluation_status = 'pending_backfill';
