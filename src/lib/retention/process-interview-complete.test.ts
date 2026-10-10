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

import {
  processInterviewRetention,
  processInterviewRetentionSafely,
} from '@/lib/retention/process-interview-complete';

const USER = 'user-1';
const IV = 'iv-1';
// checkAndUnlockTier/updateStreak zod-validate userId/interviewId as UUIDs —
// the existingLog short-circuit tests above never reach that validation, but
// the full first-time-path tests below do, so they need real UUID shapes.
const USER_UUID = '11111111-1111-4111-8111-111111111111';
const IV_V21 = '66666666-6666-4666-8666-666666666666';

const dims = (v: number) => ({
  communication_clarity: v,
  technical_depth: v,
  answer_structure: v,
  confidence: v,
  relevance: v,
});

/** Production answer_evaluations shape — `{ score, note }` per dimension. */
const scriptEvalDims = (v: number) => ({
  relevance: { score: v, note: 'ok' },
  content_accuracy: { score: v, note: 'ok' },
  communication_clarity: { score: v, note: 'ok' },
  structure: { score: v, note: 'ok' },
  specificity: { score: v, note: 'ok' },
});

function coreAnswerTurn(
  turnIndex: number,
  presentedIso: string,
  answeredIso: string | null,
  answer = 'Detailed answer with concrete examples and trade-offs.',
) {
  return {
    interview_id: IV_V21,
    turn_index: turnIndex,
    phase: 'core',
    is_question: true,
    submitted_as: 'raw',
    answer_text: answer,
    created_at: presentedIso,
    answered_at: answeredIso,
    llm_output: { is_follow_up: false },
    structured_answer: null,
  };
}

function baseV21Progress() {
  return {
    user_id: USER_UUID,
    current_tier: 1,
    current_streak: 0,
    longest_streak: 0,
    last_quality_session_date: null,
    badges_earned: [],
    total_xp: 0,
    sessions_at_current_tier: 0,
    total_sessions: 0,
    overall_avg_score: null,
    last_5_sessions_avg: null,
    max_dimension_score: null,
  };
}

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

describe('processInterviewRetention — streak retry self-repair', () => {
  it('re-applies updateStreak on retry when session_quality_log exists but streak was never updated', async () => {
    const IV_NEW = '55555555-5555-4555-8555-555555555555';

    db.interviews = [
      {
        id: IV_NEW,
        user_id: USER_UUID,
        status: 'completed',
        question_count: 1,
        started_at: '2026-07-01T00:00:00.000Z',
        role: 'Backend Engineer',
      },
    ];
    // Prior attempt inserted the log (quality met) but crashed before updateStreak.
    db.session_quality_log = [
      {
        id: 'sql-partial',
        interview_id: IV_NEW,
        user_id: USER_UUID,
        questions_answered: 1,
        total_questions: 1,
        avg_answer_duration_sec: 120,
        session_score: 7,
        quality_met: true,
        dimension_scores: dims(7),
        max_dimension_score: 7,
        completed_at: '2026-07-01T01:00:00.000Z',
        unlock_contribution: { streak_delta: 0, xp_gained: 70 },
      },
    ];
    db.user_progress = [
      {
        user_id: USER_UUID,
        current_streak: 0,
        longest_streak: 0,
        last_quality_session_date: null,
        badges_earned: [],
        current_tier: 1,
        total_xp: 0,
        sessions_at_current_tier: 0,
        total_sessions: 1,
        overall_avg_score: 7,
        last_5_sessions_avg: 7,
        max_dimension_score: 7,
      },
    ];

    const result = await processInterviewRetention(USER_UUID, IV_NEW);

    expect(result.sessionLogged).toBe(false);
    expect(result.streak).toBe(1);
    expect(db.user_progress[0].current_streak).toBe(1);
    expect(db.user_progress[0].longest_streak).toBe(1);
    expect(db.user_progress[0].last_quality_session_date).toBe('2026-07-01');
    // Legacy partial write (no progress_applied) with untouched XP also repairs XP once.
    expect(db.user_progress[0].total_xp).toBe(70);
    expect(db.session_quality_log[0].unlock_contribution).toMatchObject({
      progress_applied: true,
      xp_gained: 70,
      streak_delta: 1,
    });
  });

  it('unique-constraint conflict reconciles missing streak and XP instead of idle return', async () => {
    const IV_NEW = '55555555-5555-4555-8555-555555555555';
    db.interviews = [
      {
        id: IV_NEW,
        user_id: USER_UUID,
        status: 'completed',
        engine: 'v2.1',
        question_count: 1,
        started_at: '2026-10-10T06:00:00.000Z',
        role: 'Full Stack Developer',
      },
    ];
    db.user_progress = [
      {
        user_id: USER_UUID,
        current_streak: 0,
        longest_streak: 0,
        last_quality_session_date: null,
        badges_earned: [],
        current_tier: 1,
        total_xp: 0,
        sessions_at_current_tier: 0,
        total_sessions: 0,
        overall_avg_score: null,
        last_5_sessions_avg: null,
        max_dimension_score: null,
      },
    ];
    db.script_turns = [
      {
        interview_id: IV_NEW,
        turn_index: 3,
        phase: 'core',
        is_question: true,
        submitted_as: 'raw',
        answer_text: 'Detailed answer with concrete examples.',
        created_at: '2026-10-10T06:10:00.000Z',
        answered_at: '2026-10-10T06:12:00.000Z',
        timer_seconds: 90,
        llm_output: { is_follow_up: false },
      },
    ];
    db.answer_evaluations = [
      {
        interview_id: IV_NEW,
        turn_index: 3,
        status: 'scored',
        overall: 7.76,
        dimensions: {
          relevance: { score: 8, note: 'ok' },
          content_accuracy: { score: 8, note: 'ok' },
          communication_clarity: { score: 7, note: 'ok' },
          structure: { score: 7, note: 'ok' },
          specificity: { score: 8, note: 'ok' },
        },
      },
    ];

    // Race: concurrent winner inserted between our existence check and insert.
    onError = (table, mode) => {
      if (table === 'session_quality_log' && mode === 'insert') {
        db.session_quality_log = [
          {
            id: 'sql-winner',
            interview_id: IV_NEW,
            user_id: USER_UUID,
            questions_answered: 1,
            total_questions: 1,
            avg_answer_duration_sec: 120,
            session_score: 7.76,
            quality_met: true,
            completed_at: '2026-10-10T06:59:11.000Z',
            unlock_contribution: {
              streak_delta: 0,
              xp_gained: 78,
              progress_applied: false,
              badge_earned: null,
              tier_unlocked: null,
            },
          },
        ];
        return { message: 'duplicate key value violates unique constraint', code: '23505' };
      }
      return null;
    };

    const result = await processInterviewRetention(USER_UUID, IV_NEW);

    expect(result.sessionLogged).toBe(false);
    expect(db.session_quality_log).toHaveLength(1);
    expect(db.user_progress[0].current_streak).toBe(1);
    expect(db.user_progress[0].total_xp).toBe(78);
    expect(db.session_quality_log[0].unlock_contribution).toMatchObject({
      progress_applied: true,
      streak_delta: 1,
    });
  });

  it('retry after unique-conflict reconcile is idempotent (no double XP)', async () => {
    const IV_NEW = '55555555-5555-4555-8555-555555555555';
    db.interviews = [
      {
        id: IV_NEW,
        user_id: USER_UUID,
        status: 'completed',
        question_count: 1,
        started_at: '2026-10-10T06:00:00.000Z',
        role: 'Backend Engineer',
      },
    ];
    db.session_quality_log = [
      {
        id: 'sql-partial',
        interview_id: IV_NEW,
        user_id: USER_UUID,
        questions_answered: 1,
        total_questions: 1,
        avg_answer_duration_sec: 120,
        session_score: 7.76,
        quality_met: true,
        completed_at: '2026-10-10T06:59:11.000Z',
        unlock_contribution: {
          streak_delta: 0,
          xp_gained: 78,
          progress_applied: false,
          badge_earned: null,
          tier_unlocked: null,
        },
      },
    ];
    db.user_progress = [
      {
        user_id: USER_UUID,
        current_streak: 0,
        longest_streak: 0,
        last_quality_session_date: null,
        badges_earned: [],
        current_tier: 1,
        total_xp: 0,
        sessions_at_current_tier: 0,
        total_sessions: 1,
        overall_avg_score: 7.76,
        last_5_sessions_avg: 7.76,
        max_dimension_score: 8,
      },
    ];

    await processInterviewRetention(USER_UUID, IV_NEW);
    expect(db.user_progress[0].total_xp).toBe(78);
    expect(db.user_progress[0].current_streak).toBe(1);

    await processInterviewRetention(USER_UUID, IV_NEW);
    expect(db.user_progress[0].total_xp).toBe(78);
    expect(db.user_progress[0].current_streak).toBe(1);
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

describe('processInterviewRetention — v2.1 script engine', () => {
  it('qualifying 8.2/10 session with valid answered_at durations increments streak', async () => {
    db.interviews = [
      {
        id: IV_V21,
        user_id: USER_UUID,
        status: 'completed',
        engine: 'v2.1',
        question_count: 4,
        started_at: '2026-10-09T13:15:00.000Z',
        role: 'Full Stack Developer',
      },
    ];
    db.user_progress = [baseV21Progress()];
    db.script_turns = [
      {
        interview_id: IV_V21,
        turn_index: 2,
        phase: 'core',
        is_question: false,
        submitted_as: null,
        answer_text: null,
        created_at: '2026-10-09T13:15:10.000Z',
        answered_at: null,
        llm_output: {},
        structured_answer: null,
      },
      coreAnswerTurn(3, '2026-10-09T13:15:51.000Z', '2026-10-09T13:17:51.000Z'),
      coreAnswerTurn(4, '2026-10-09T13:18:14.000Z', '2026-10-09T13:20:14.000Z'),
      coreAnswerTurn(5, '2026-10-09T13:21:17.000Z', '2026-10-09T13:23:17.000Z'),
      coreAnswerTurn(6, '2026-10-09T13:23:57.000Z', '2026-10-09T13:25:57.000Z'),
      {
        interview_id: IV_V21,
        turn_index: 9,
        phase: 'closing',
        is_question: false,
        submitted_as: null,
        answer_text: null,
        created_at: '2026-10-09T13:26:00.000Z',
        answered_at: null,
        llm_output: {},
        structured_answer: null,
      },
    ];
    // Mean overall = (7.9 + 8.5 + 8.2 + 8.2) / 4 = 8.2
    db.answer_evaluations = [
      { interview_id: IV_V21, turn_index: 3, status: 'scored', overall: 7.9, dimensions: scriptEvalDims(8) },
      { interview_id: IV_V21, turn_index: 4, status: 'scored', overall: 8.5, dimensions: scriptEvalDims(8) },
      { interview_id: IV_V21, turn_index: 5, status: 'scored', overall: 8.2, dimensions: scriptEvalDims(8) },
      { interview_id: IV_V21, turn_index: 6, status: 'scored', overall: 8.2, dimensions: scriptEvalDims(8) },
    ];

    const result = await processInterviewRetention(USER_UUID, IV_V21);

    expect(result.sessionLogged).toBe(true);
    expect(result.qualityMet).toBe(true);
    expect(result.streak).toBe(1);
    expect(db.user_progress[0].current_streak).toBe(1);
    expect(db.user_progress[0].total_xp).toBe(82);
    const log = db.session_quality_log.find((r) => r.interview_id === IV_V21);
    expect(log).toMatchObject({
      session_score: 8.2,
      questions_answered: 4,
      total_questions: 4,
      avg_answer_duration_sec: 120,
      quality_met: true,
    });
  });

  it('8.2/10 session that fails duration does not increment streak', async () => {
    db.interviews = [
      {
        id: IV_V21,
        user_id: USER_UUID,
        status: 'completed',
        engine: 'v2.1',
        question_count: 4,
        started_at: '2026-10-09T13:15:00.000Z',
        role: 'Full Stack Developer',
      },
    ];
    db.user_progress = [baseV21Progress()];
    // 20s average — below 45s threshold
    db.script_turns = [
      coreAnswerTurn(3, '2026-10-09T13:15:51.000Z', '2026-10-09T13:16:11.000Z'),
      coreAnswerTurn(4, '2026-10-09T13:16:20.000Z', '2026-10-09T13:16:40.000Z'),
      coreAnswerTurn(5, '2026-10-09T13:16:50.000Z', '2026-10-09T13:17:10.000Z'),
      coreAnswerTurn(6, '2026-10-09T13:17:20.000Z', '2026-10-09T13:17:40.000Z'),
    ];
    db.answer_evaluations = [
      { interview_id: IV_V21, turn_index: 3, status: 'scored', overall: 8.2, dimensions: scriptEvalDims(8) },
      { interview_id: IV_V21, turn_index: 4, status: 'scored', overall: 8.2, dimensions: scriptEvalDims(8) },
      { interview_id: IV_V21, turn_index: 5, status: 'scored', overall: 8.2, dimensions: scriptEvalDims(8) },
      { interview_id: IV_V21, turn_index: 6, status: 'scored', overall: 8.2, dimensions: scriptEvalDims(8) },
    ];

    const result = await processInterviewRetention(USER_UUID, IV_V21);

    expect(result.sessionLogged).toBe(true);
    expect(result.qualityMet).toBe(false);
    expect(result.streak).toBe(0);
    expect(db.user_progress[0].current_streak).toBe(0);
    expect(db.user_progress[0].total_xp).toBe(0);
    expect(db.session_quality_log[0]).toMatchObject({
      session_score: 8.2,
      avg_answer_duration_sec: 20,
      quality_met: false,
    });
  });

  it('score below 6.0 does not qualify even with valid duration', async () => {
    db.interviews = [
      {
        id: IV_V21,
        user_id: USER_UUID,
        status: 'completed',
        engine: 'v2.1',
        question_count: 2,
        started_at: '2026-10-09T13:15:00.000Z',
        role: 'Full Stack Developer',
      },
    ];
    db.user_progress = [baseV21Progress()];
    db.script_turns = [
      coreAnswerTurn(3, '2026-10-09T13:15:51.000Z', '2026-10-09T13:17:51.000Z'),
      coreAnswerTurn(4, '2026-10-09T13:18:14.000Z', '2026-10-09T13:20:14.000Z'),
    ];
    db.answer_evaluations = [
      { interview_id: IV_V21, turn_index: 3, status: 'scored', overall: 5.0, dimensions: scriptEvalDims(5) },
      { interview_id: IV_V21, turn_index: 4, status: 'scored', overall: 5.0, dimensions: scriptEvalDims(5) },
    ];

    const result = await processInterviewRetention(USER_UUID, IV_V21);
    expect(result.qualityMet).toBe(false);
    expect(result.streak).toBe(0);
    expect(db.session_quality_log[0].quality_met).toBe(false);
  });

  it('missing answered_at cannot fabricate a passing duration', async () => {
    db.interviews = [
      {
        id: IV_V21,
        user_id: USER_UUID,
        status: 'completed',
        engine: 'v2.1',
        question_count: 2,
        started_at: '2026-10-09T13:15:00.000Z',
        role: 'Full Stack Developer',
      },
    ];
    db.user_progress = [baseV21Progress()];
    db.script_turns = [
      coreAnswerTurn(3, '2026-10-09T13:15:51.000Z', null),
      coreAnswerTurn(4, '2026-10-09T13:18:14.000Z', null),
      {
        interview_id: IV_V21,
        turn_index: 9,
        phase: 'closing',
        is_question: false,
        submitted_as: null,
        answer_text: null,
        created_at: '2026-10-09T14:00:00.000Z',
        answered_at: null,
        llm_output: {},
        structured_answer: null,
      },
    ];
    db.answer_evaluations = [
      { interview_id: IV_V21, turn_index: 3, status: 'scored', overall: 8.2, dimensions: scriptEvalDims(8) },
      { interview_id: IV_V21, turn_index: 4, status: 'scored', overall: 8.2, dimensions: scriptEvalDims(8) },
    ];

    const result = await processInterviewRetention(USER_UUID, IV_V21);
    expect(result.qualityMet).toBe(false);
    expect(db.session_quality_log[0].avg_answer_duration_sec).toBe(0);
    expect(db.user_progress[0].current_streak).toBe(0);
  });

  it('missing evaluation set is an observable recoverable failure', async () => {
    db.interviews = [
      {
        id: IV_V21,
        user_id: USER_UUID,
        status: 'completed',
        engine: 'v2.1',
        question_count: 2,
        started_at: '2026-10-09T13:15:00.000Z',
        role: 'Full Stack Developer',
      },
    ];
    db.user_progress = [baseV21Progress()];
    db.script_turns = [
      coreAnswerTurn(3, '2026-10-09T13:15:51.000Z', '2026-10-09T13:17:51.000Z'),
      coreAnswerTurn(4, '2026-10-09T13:18:14.000Z', '2026-10-09T13:20:14.000Z'),
    ];
    db.answer_evaluations = [];

    await expect(processInterviewRetention(USER_UUID, IV_V21)).rejects.toThrow(
      'No evaluations for interview',
    );
    expect(await processInterviewRetentionSafely(USER_UUID, IV_V21)).toBeNull();
    expect(db.session_quality_log).toHaveLength(0);
  });

  it('duplicate completion does not double-award XP', async () => {
    db.interviews = [
      {
        id: IV_V21,
        user_id: USER_UUID,
        status: 'completed',
        engine: 'v2.1',
        question_count: 2,
        started_at: '2026-10-09T13:15:00.000Z',
        role: 'Full Stack Developer',
      },
    ];
    db.user_progress = [baseV21Progress()];
    db.script_turns = [
      coreAnswerTurn(3, '2026-10-09T13:15:51.000Z', '2026-10-09T13:17:51.000Z'),
      coreAnswerTurn(4, '2026-10-09T13:18:14.000Z', '2026-10-09T13:20:14.000Z'),
    ];
    db.answer_evaluations = [
      { interview_id: IV_V21, turn_index: 3, status: 'scored', overall: 8.0, dimensions: scriptEvalDims(8) },
      { interview_id: IV_V21, turn_index: 4, status: 'scored', overall: 8.0, dimensions: scriptEvalDims(8) },
    ];

    const first = await processInterviewRetention(USER_UUID, IV_V21);
    expect(first.sessionLogged).toBe(true);
    expect(first.qualityMet).toBe(true);
    expect(db.user_progress[0].total_xp).toBe(80);
    expect(db.user_progress[0].current_streak).toBe(1);

    const second = await processInterviewRetention(USER_UUID, IV_V21);
    expect(second.sessionLogged).toBe(false);
    expect(db.user_progress[0].total_xp).toBe(80);
    expect(db.user_progress[0].current_streak).toBe(1);
    expect(db.session_quality_log.filter((r) => r.interview_id === IV_V21)).toHaveLength(1);
  });

  it('bridges {score,note} eval dimensions onto V1 retention slots', async () => {
    db.interviews = [
      {
        id: IV_V21,
        user_id: USER_UUID,
        status: 'completed',
        engine: 'v2.1',
        question_count: 1,
        started_at: '2026-10-09T13:15:00.000Z',
        role: 'Full Stack Developer',
      },
    ];
    db.user_progress = [baseV21Progress()];
    db.script_turns = [
      coreAnswerTurn(3, '2026-10-09T13:15:51.000Z', '2026-10-09T13:17:51.000Z'),
    ];
    db.answer_evaluations = [
      {
        interview_id: IV_V21,
        turn_index: 3,
        status: 'scored',
        overall: 8.0,
        dimensions: {
          relevance: { score: 7, note: 'r' },
          content_accuracy: { score: 10, note: 'c' },
          communication_clarity: { score: 6, note: 'cc' },
          structure: { score: 5, note: 's' },
          specificity: { score: 4, note: 'sp' },
        },
      },
    ];

    const result = await processInterviewRetention(USER_UUID, IV_V21);
    expect(result.sessionLogged).toBe(true);
    expect(db.session_quality_log[0].dimension_scores).toEqual({
      communication_clarity: 6,
      technical_depth: 10,
      answer_structure: 5,
      confidence: 4,
      relevance: 7,
    });
  });
});
