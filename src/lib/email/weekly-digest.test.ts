import { describe, expect, it } from 'vitest';
import {
  averageScoresFromPrefetch,
  buildUserDigestFromBundle,
  splitDigestWindows,
  weeklyDigestWindows,
  type WeeklyDigestBundle,
} from './weekly-digest-data';

describe('buildUserDigestFromBundle', () => {
  it('builds the same week key, streak, and scaled scores from prefetch rows', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    const windows = weeklyDigestWindows(now);
    const completedAt = new Date(windows.statsStart.getTime() + 86400000).toISOString();
    const bundle: WeeklyDigestBundle = {
      interviewsByUser: new Map([
        [
          'u1',
          [
            {
              id: 'i1',
              user_id: 'u1',
              completed_at: completedAt,
              started_at: new Date(Date.parse(completedAt) - 20 * 60000).toISOString(),
              engine: 'v2.1',
            },
          ],
        ],
      ]),
      users: [{ id: 'u1', email: 'ada@example.com', name: 'Ada' }],
      streakByUser: new Map([['u1', 5]]),
      reportOveralls: [{ interview_id: 'i1', overall: 8.2 }],
      scriptRows: [],
      v1Evals: [],
    };

    const split = splitDigestWindows(bundle.interviewsByUser.get('u1') ?? [], windows);
    expect(split.eligible).toBe(true);
    const agg = averageScoresFromPrefetch(['i1'], bundle);
    expect(agg?.overallAvg10).toBeCloseTo(8.2);

    const digest = buildUserDigestFromBundle(
      { id: 'u1', email: 'ada@example.com', name: 'Ada' },
      bundle,
      windows,
      {
        baseUrl: 'https://interviewera.com',
        practiceUrl: 'https://interviewera.com/interview/script/start',
        unsubscribeUrl: 'https://interviewera.com/api/email/unsubscribe?userId=u1&token=test',
      },
    );
    expect(digest).not.toBeNull();
    expect(digest?.idempotencyKey).toBe(
      `weekly:u1:${windows.statsStart.toISOString().slice(0, 10)}`,
    );
    expect(digest?.streak).toBe(5);
    expect(digest?.lastWeekCount).toBe(1);
    expect(digest?.practiceMinutes).toBe(20);
    expect(digest?.currentWeekScore).toBe(82);
    expect(digest?.templateProps.candidateName).toBe('Ada');
    expect(digest?.templateProps.unsubscribeUrl).toContain('userId=u1');
  });

  it('returns null when the user has no scored interviews', () => {
    const windows = weeklyDigestWindows(new Date('2026-06-15T12:00:00.000Z'));
    const digest = buildUserDigestFromBundle(
      { id: 'u-missing', email: 'x@example.com', name: null },
      {
        interviewsByUser: new Map(),
        users: [],
        streakByUser: new Map(),
        reportOveralls: [],
        scriptRows: [],
        v1Evals: [],
      },
      windows,
      {
        baseUrl: 'https://interviewera.com',
        practiceUrl: 'https://interviewera.com/interview/script/start',
        unsubscribeUrl: 'https://interviewera.com/api/email/unsubscribe?userId=x&token=test',
      },
    );
    expect(digest).toBeNull();
  });
});
