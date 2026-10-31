import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';

vi.mock('server-only', () => ({}));

let db: FakeDb;
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeFakeServiceClient(db),
}));

import {
  evaluateQuality,
  istCalendarDate,
  istYesterdayOf,
  updateStreak,
  type StreakSessionPayload,
} from './streak-tracker';

const USER = '11111111-1111-4111-8111-111111111111';
const IV = '22222222-2222-4222-8222-222222222222';

/** Quality-passing session defaults (5/5 questions, 60s avg, score 7). */
function qualityPayload(overrides: Partial<StreakSessionPayload> = {}): StreakSessionPayload {
  return {
    interviewId: IV,
    questionsAnswered: 5,
    totalQuestions: 5,
    avgAnswerDurationSec: 60,
    sessionScore: 7,
    ...overrides,
  };
}

function seedProgress(overrides: Record<string, unknown> = {}) {
  db.user_progress = [
    {
      user_id: USER,
      current_streak: 0,
      longest_streak: 0,
      last_quality_session_date: null,
      badges_earned: [],
      ...overrides,
    },
  ];
}

beforeEach(() => {
  db = { user_progress: [] };
});

describe('istCalendarDate — timezone boundary (Case H)', () => {
  it('maps UTC midnight to IST calendar day', () => {
    // 2026-07-01 00:30 UTC → 2026-07-01 06:00 IST → still July 1
    expect(istCalendarDate(new Date('2026-07-01T00:30:00.000Z'))).toBe('2026-07-01');
    // 2026-06-30 18:30 UTC → 2026-07-01 00:00 IST → July 1
    expect(istCalendarDate(new Date('2026-06-30T18:30:00.000Z'))).toBe('2026-07-01');
    // 2026-06-30 18:29 UTC → still June 30 IST
    expect(istCalendarDate(new Date('2026-06-30T18:29:00.000Z'))).toBe('2026-06-30');
  });
});

describe('evaluateQuality', () => {
  it('passes when all criteria met', () => {
    expect(evaluateQuality(qualityPayload()).passed).toBe(true);
  });

  it('fails when questions skipped (Case G partial)', () => {
    expect(evaluateQuality(qualityPayload({ questionsAnswered: 4, totalQuestions: 5 })).passed).toBe(
      false,
    );
  });

  it('fails when avg duration below floor', () => {
    expect(evaluateQuality(qualityPayload({ avgAnswerDurationSec: 20 })).passed).toBe(false);
  });

  it('fails when session score below minimum', () => {
    expect(evaluateQuality(qualityPayload({ sessionScore: 4.9 })).passed).toBe(false);
  });
});

describe('updateStreak — product rules', () => {
  const day1 = new Date('2026-07-01T12:00:00.000Z'); // July 1 IST
  const day2 = new Date('2026-07-02T12:00:00.000Z'); // July 2 IST
  const day4 = new Date('2026-07-04T12:00:00.000Z'); // July 4 IST (gap from day2)

  it('Case A — first qualifying completion sets streak to 1', async () => {
    seedProgress();
    const result = await updateStreak(USER, qualityPayload(), { now: day1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.streakAction).toBe('started_fresh');
    expect(db.user_progress[0].current_streak).toBe(1);
    expect(db.user_progress[0].longest_streak).toBe(1);
    expect(db.user_progress[0].last_quality_session_date).toBe('2026-07-01');
  });

  it('Case B — same-day second completion is idempotent', async () => {
    seedProgress({
      current_streak: 1,
      longest_streak: 1,
      last_quality_session_date: '2026-07-01',
    });
    const result = await updateStreak(USER, qualityPayload({ interviewId: '33333333-3333-4333-8333-333333333333' }), {
      now: day1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.streakAction).toBe('same_day_noop');
    expect(result.newStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(db.user_progress[0].current_streak).toBe(1);
  });

  it('Case B2 — same-day completion when streak is 0 (old reset) starts fresh at 1', async () => {
    // Scenario: an earlier session today ran old code that reset streak to 0
    // and wrote last_quality_session_date = today. A valid subsequent session
    // the same day should un-stick the streak at 1 rather than staying 0 forever.
    seedProgress({
      current_streak: 0,
      longest_streak: 3,
      last_quality_session_date: '2026-07-01',
    });
    const result = await updateStreak(USER, qualityPayload({ interviewId: '44444444-4444-4444-8444-444444444444' }), {
      now: day1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.streakAction).toBe('restarted_after_gap');
    expect(result.newStreak).toBe(1);
    expect(result.longestStreak).toBe(3);
    expect(db.user_progress[0].current_streak).toBe(1);
    expect(db.user_progress[0].last_quality_session_date).toBe('2026-07-01');
  });

  it('Case C — consecutive IST day increments by exactly 1', async () => {
    seedProgress({
      current_streak: 2,
      longest_streak: 2,
      last_quality_session_date: istYesterdayOf(day2),
    });
    const result = await updateStreak(USER, qualityPayload(), { now: day2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.streakAction).toBe('incremented');
  });

  it('Case D — missed day restarts at 1 (lazy gap detection)', async () => {
    seedProgress({
      current_streak: 5,
      longest_streak: 5,
      last_quality_session_date: '2026-07-02',
    });
    const result = await updateStreak(USER, qualityPayload(), { now: day4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStreak).toBe(1);
    expect(result.longestStreak).toBe(5);
    expect(result.streakAction).toBe('restarted_after_gap');
  });

  it('Case G — low-quality completed session still counts for the streak', async () => {
    seedProgress({
      current_streak: 4,
      longest_streak: 4,
      last_quality_session_date: istYesterdayOf(day2),
    });
    const result = await updateStreak(
      USER,
      qualityPayload({ sessionScore: 4, avgAnswerDurationSec: 10 }),
      { now: day2 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.qualityMet).toBe(false);
    expect(result.newStreak).toBe(5);
    expect(result.streakAction).toBe('incremented');
  });

  it('Case G2 — completed interview with a skipped question never resets the streak', async () => {
    seedProgress({
      current_streak: 1,
      longest_streak: 1,
      last_quality_session_date: istYesterdayOf(day2),
    });
    const result = await updateStreak(
      USER,
      qualityPayload({ questionsAnswered: 3, totalQuestions: 4 }),
      { now: day2 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStreak).toBe(2);
    expect(result.streakAction).toBe('incremented');
  });

  it('Case G3 — same day: second interview with a skip keeps the streak', async () => {
    seedProgress({
      current_streak: 1,
      longest_streak: 1,
      last_quality_session_date: istYesterdayOf(day2),
    });
    await updateStreak(USER, qualityPayload(), { now: day2 });
    const result = await updateStreak(
      USER,
      qualityPayload({
        interviewId: '44444444-4444-4444-8444-444444444444',
        questionsAnswered: 3,
        totalQuestions: 4,
      }),
      { now: day2 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStreak).toBe(2);
    expect(result.streakAction).toBe('same_day_noop');
  });

  it('Case G4 — zero answered questions leaves the streak unchanged', async () => {
    seedProgress({
      current_streak: 3,
      longest_streak: 3,
      last_quality_session_date: istYesterdayOf(day2),
    });
    const result = await updateStreak(
      USER,
      qualityPayload({ questionsAnswered: 0, totalQuestions: 4 }),
      { now: day2 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.newStreak).toBe(3);
    expect(result.streakAction).toBe('not_counted');
  });

  it('Case E — concurrent same-day writes do not double-increment', async () => {
    seedProgress({
      current_streak: 2,
      longest_streak: 2,
      last_quality_session_date: istYesterdayOf(day2),
    });
    const [a, b] = await Promise.all([
      updateStreak(USER, qualityPayload(), { now: day2 }),
      updateStreak(
        USER,
        qualityPayload({ interviewId: '44444444-4444-4444-8444-444444444444' }),
        { now: day2 },
      ),
    ]);
    expect(a.ok && b.ok).toBe(true);
    expect(db.user_progress[0].current_streak).toBeLessThanOrEqual(3);
    expect(db.user_progress[0].current_streak).toBeGreaterThanOrEqual(2);
  });
});
