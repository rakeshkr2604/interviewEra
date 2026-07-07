import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';

/**
 * P2 self-repair: when a prior retention attempt inserted the
 * session_quality_log row but failed before the user_progress roll-up landed,
 * a retry must recompute the roll-up from the durable log instead of
 * short-circuiting and leaving counters permanently stale (root-cause F3).
 *
 * total_sessions is recomputed from a COUNT of `interviews` rows with
 * status='completed' — NOT from session_quality_log row count. A completed
 * interview whose evaluations never persisted never gets a log row, so the
 * two diverge in production; every fixture below models that gap explicitly
 * via a separate `interviews` table.
 */

// `server-only` throws outside an RSC bundle; the retention module pulls it in
// transitively via the analytics-server import. Stub it for the node test env.
vi.mock('server-only', () => ({}));

// The full first-time completion path also fires funnel/product-event
// telemetry — stub both so the test stays hermetic and isolated to the
// retention/rollup logic under test.
vi.mock('@/lib/analytics/funnel', () => ({ trackFunnelEvent: vi.fn() }));
vi.mock('@/lib/analytics/product-events-server', () => ({ trackProductEventServer: vi.fn() }));

let db: FakeDb;
let onError: ((table: string, mode: string) => { message: string } | null) | undefined;
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeFakeServiceClient(db, (table, mode) => onError?.(table, mode) ?? null),
}));

import { processInterviewRetention } from '@/lib/retention/process-interview-complete';

const USER = 'user-1';
const IV = 'iv-1';
// checkAndUnlockTier/updateStreak zod-validate userId/interviewId as UUIDs —
// the existingLog short-circuit tests above never reach that validation, but
// the full first-time-path tests below do, so they need real UUID shapes.
const USER_UUID = '11111111-1111-4111-8111-111111111111';

const dims = (v: number) => ({
  communication_clarity: v,
  technical_depth: v,
  answer_structure: v,
  confidence: v,
  relevance: v,
});

beforeEach(() => {
  db = {
    session_quality_log: [],
    user_progress: [],
    interviews: [],
  };
  onError = undefined;
});

describe('processInterviewRetention — existingLog self-repair', () => {
  it('recomputes stale user_progress roll-ups from the durable log on retry', async () => {
    // Two logged sessions for this user (scores 6 and 8) — the durable truth.
    db.session_quality_log = [
      {
        id: 'sql-1',
        interview_id: IV,
        user_id: USER,
        session_score: 6,
        dimension_scores: dims(6),
        max_dimension_score: 6,
        completed_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'sql-2',
        interview_id: 'iv-2',
        user_id: USER,
        session_score: 8,
        dimension_scores: dims(8),
        max_dimension_score: 8,
        completed_at: '2026-07-02T00:00:00Z',
      },
    ];
    // Ground truth for total_sessions: 2 completed interviews, matching the
    // 2 log rows above (no divergence in this fixture).
    db.interviews = [
      { id: IV, user_id: USER, status: 'completed' },
      { id: 'iv-2', user_id: USER, status: 'completed' },
    ];
    // user_progress is stale: reflects only 1 session (partial-write victim).
    db.user_progress = [
      {
        user_id: USER,
        current_tier: 1,
        current_streak: 0,
        total_xp: 0,
        sessions_at_current_tier: 0,
        total_sessions: 1,
        overall_avg_score: 6,
        last_5_sessions_avg: 6,
        max_dimension_score: 6,
      },
    ];

    // The interview being "completed" again already has a log row → short-circuit.
    const result = await processInterviewRetention(USER, IV);

    // idlePayload shape (session not re-logged).
    expect(result.sessionLogged).toBe(false);

    // Roll-ups repaired from the 2 durable log rows.
    const prog = db.user_progress[0];
    expect(prog.total_sessions).toBe(2);
    expect(prog.overall_avg_score).toBe(7); // mean(6,8)
    expect(prog.last_5_sessions_avg).toBe(7);
    expect(prog.max_dimension_score).toBe(8);
  });

  it('is a no-op write when roll-ups already match the log (idempotent)', async () => {
    db.session_quality_log = [
      {
        id: 'sql-1',
        interview_id: IV,
        user_id: USER,
        session_score: 5,
        dimension_scores: dims(5),
        max_dimension_score: 5,
        completed_at: '2026-07-01T00:00:00Z',
      },
    ];
    // Ground truth for total_sessions: 1 completed interview, matching the
    // 1 log row above.
    db.interviews = [{ id: IV, user_id: USER, status: 'completed' }];
    db.user_progress = [
      {
        user_id: USER,
        current_tier: 1,
        current_streak: 0,
        total_xp: 0,
        sessions_at_current_tier: 0,
        total_sessions: 1,
        overall_avg_score: 5,
        last_5_sessions_avg: 5,
        max_dimension_score: 5,
      },
    ];

    await processInterviewRetention(USER, IV);

    const prog = db.user_progress[0];
    expect(prog.total_sessions).toBe(1);
    expect(prog.overall_avg_score).toBe(5);
    expect(prog.max_dimension_score).toBe(5);
  });
});

describe('processInterviewRetention — first-time completion (no retry needed)', () => {
  it('recomputes user_progress immediately after insert, before checkAndUnlockTier/updateStreak run — a later throw does not leave it stale', async () => {
    const IV_OLD_1 = '22222222-2222-4222-8222-222222222222';
    const IV_OLD_2 = '33333333-3333-4333-8333-333333333333';
    const IV_NEW = '55555555-5555-4555-8555-555555555555';

    // 3 completed interviews for this user; only 1 has a session_quality_log
    // row (IV_OLD_2 simulates a completed interview whose evaluations never
    // persisted — the exact gap that makes log-row-count diverge from the
    // real completed-interview count in production).
    db.interviews = [
      { id: IV_OLD_1, user_id: USER_UUID, status: 'completed', question_count: 5, started_at: '2026-06-01T00:00:00Z', role: 'Backend Engineer' },
      { id: IV_OLD_2, user_id: USER_UUID, status: 'completed', question_count: 5, started_at: '2026-06-05T00:00:00Z', role: 'Backend Engineer' },
      { id: IV_NEW, user_id: USER_UUID, status: 'completed', question_count: 1, started_at: '2026-07-01T00:00:00Z', role: 'Backend Engineer' },
    ];
    db.session_quality_log = [
      {
        id: 'sql-old-1',
        interview_id: IV_OLD_1,
        user_id: USER_UUID,
        session_score: 6,
        dimension_scores: dims(6),
        max_dimension_score: 6,
        completed_at: '2026-06-01T01:00:00Z',
      },
    ];
    db.questions = [{ id: 'q-1', interview_id: IV_NEW, order_index: 0 }];
    db.answers = [{ id: 'a-1', question_id: 'q-1', submitted_at: '2026-07-01T00:05:00Z' }];
    db.evaluations = [{ id: 'e-1', answer_id: 'a-1', overall_score: 7, dimension_scores: dims(7) }];
    db.user_progress = [
      {
        user_id: USER_UUID,
        current_tier: 1,
        current_streak: 0,
        total_xp: 0,
        sessions_at_current_tier: 0,
        total_sessions: 1,
        overall_avg_score: 6,
        last_5_sessions_avg: 6,
        max_dimension_score: 6,
      },
    ];

    // Fail the 3rd `user_progress` SELECT overall. In order: (1)
    // progressRowBeforeRaw before the insert, (2) checkAndUnlockTier's
    // internal loadProgress, (3) updateStreak's internal loadProgress — so
    // the insert + immediate post-insert recompute have already both run,
    // and the failure surfaces as the documented
    // `if (!streakResult.ok) throw` in processInterviewRetention.
    let userProgressSelectCount = 0;
    onError = (table, mode) => {
      if (table === 'user_progress' && mode === 'select') {
        userProgressSelectCount += 1;
        if (userProgressSelectCount === 3) {
          return { message: 'simulated user_progress read failure' };
        }
      }
      return null;
    };

    await expect(processInterviewRetention(USER_UUID, IV_NEW)).rejects.toThrow(
      'simulated user_progress read failure',
    );

    // The log insert is durable, and the immediate post-insert recompute
    // already synced user_progress — total_sessions reflects all 3 completed
    // interviews (not the 2 session_quality_log rows) even though the
    // function never reached its final success-path update.
    const prog = db.user_progress[0];
    expect(prog.total_sessions).toBe(3);
    expect(db.session_quality_log.some((r) => r.interview_id === IV_NEW)).toBe(true);
  });
});

describe('processInterviewRetention — total_sessions source', () => {
  it('derives total_sessions from completed interviews, not session_quality_log row count', async () => {
    const IV_OLD_1 = '22222222-2222-4222-8222-222222222222';
    const IV_OLD_2 = '33333333-3333-4333-8333-333333333333';
    const IV_OLD_3 = '44444444-4444-4444-8444-444444444444';
    const IV_NEW = '55555555-5555-4555-8555-555555555555';

    // 4 completed interviews; only 1 has a pre-existing log row. 2 more
    // (IV_OLD_2, IV_OLD_3) simulate completed interviews whose evaluations
    // never persisted — the production gap (46 completed vs. 30 logged).
    db.interviews = [
      { id: IV_OLD_1, user_id: USER_UUID, status: 'completed', question_count: 5, started_at: '2026-06-01T00:00:00Z', role: 'Backend Engineer' },
      { id: IV_OLD_2, user_id: USER_UUID, status: 'completed', question_count: 5, started_at: '2026-06-05T00:00:00Z', role: 'Backend Engineer' },
      { id: IV_OLD_3, user_id: USER_UUID, status: 'completed', question_count: 5, started_at: '2026-06-10T00:00:00Z', role: 'Backend Engineer' },
      { id: IV_NEW, user_id: USER_UUID, status: 'completed', question_count: 1, started_at: '2026-07-01T00:00:00Z', role: 'Backend Engineer' },
    ];
    db.session_quality_log = [
      {
        id: 'sql-old-1',
        interview_id: IV_OLD_1,
        user_id: USER_UUID,
        session_score: 6,
        dimension_scores: dims(6),
        max_dimension_score: 6,
        completed_at: '2026-06-01T01:00:00Z',
      },
    ];
    db.questions = [{ id: 'q-1', interview_id: IV_NEW, order_index: 0 }];
    db.answers = [{ id: 'a-1', question_id: 'q-1', submitted_at: '2026-07-01T00:05:00Z' }];
    db.evaluations = [{ id: 'e-1', answer_id: 'a-1', overall_score: 7, dimension_scores: dims(7) }];
    db.user_progress = [
      {
        user_id: USER_UUID,
        current_tier: 1,
        current_streak: 0,
        total_xp: 0,
        sessions_at_current_tier: 0,
        total_sessions: 1,
        overall_avg_score: 6,
        last_5_sessions_avg: 6,
        max_dimension_score: 6,
      },
    ];

    const result = await processInterviewRetention(USER_UUID, IV_NEW);

    expect(result.sessionLogged).toBe(true);
    // After insert, session_quality_log has 2 rows (iv-old-1 + iv-new) but
    // 4 interviews are actually completed — total_sessions must reflect 4.
    const prog = db.user_progress[0];
    expect(db.session_quality_log.length).toBe(2);
    expect(prog.total_sessions).toBe(4);
  });
});
