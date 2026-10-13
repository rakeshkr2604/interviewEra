import { describe, expect, it } from 'vitest';
import {
  averageScoresFromPrefetch,
  averageV1DimensionsForInterviewIds,
  estimateWeeklyDigestQueryCount,
  prefetchWeeklyDigestBundle,
  splitDigestWindows,
  weeklyDigestWindows,
  type DigestInterviewRow,
  type WeeklyDigestBundle,
} from './weekly-digest-data';

const NOW = new Date('2026-06-15T12:00:00.000Z');

function interview(
  id: string,
  userId: string,
  completedAt: string,
): DigestInterviewRow {
  return {
    id,
    user_id: userId,
    completed_at: completedAt,
    started_at: completedAt,
    engine: 'v2.1',
  };
}

function emptyBundle(
  overrides: Partial<WeeklyDigestBundle> = {},
): WeeklyDigestBundle {
  return {
    interviewsByUser: new Map(),
    users: [],
    streakByUser: new Map(),
    reportOveralls: [],
    scriptRows: [],
    v1Evals: [],
    ...overrides,
  };
}

describe('weeklyDigestWindows', () => {
  it('keeps the previous 30/7/37-day local-midnight bounds', () => {
    const windows = weeklyDigestWindows(NOW);
    expect(windows.eligibilityStart.getHours()).toBe(0);
    expect(windows.statsStart.getHours()).toBe(0);
    expect(windows.lookbackStart.getHours()).toBe(0);
    const dayMs = 24 * 60 * 60 * 1000;
    expect(
      Math.round(
        (windows.eligibilityStart.getTime() - windows.lookbackStart.getTime()) /
          dayMs,
      ),
    ).toBe(7);
    expect(
      Math.round(
        (windows.statsStart.getTime() - windows.eligibilityStart.getTime()) / dayMs,
      ),
    ).toBe(23);
  });
});

describe('splitDigestWindows', () => {
  it('uses the last-7-day window when current-week interviews exist', () => {
    const windows = weeklyDigestWindows(NOW);
    const currentAt = new Date(windows.statsStart.getTime() + 2 * 86400000).toISOString();
    const previousAt = new Date(
      windows.prevStatsStart.getTime() + 2 * 86400000,
    ).toISOString();
    const split = splitDigestWindows(
      [
        interview('cur', 'u1', currentAt),
        interview('prev', 'u1', previousAt),
      ],
      windows,
    );
    expect(split.eligible).toBe(true);
    expect(split.current.map((row) => row.id)).toEqual(['cur']);
    expect(split.previous.map((row) => row.id)).toEqual(['prev']);
    expect(split.periodStart).toEqual(windows.statsStart);
  });

  it('falls back to the 30-day rollup when the last 7 days are empty', () => {
    const windows = weeklyDigestWindows(NOW);
    const older = new Date(windows.eligibilityStart.getTime() + 2 * 86400000).toISOString();
    const split = splitDigestWindows([interview('old', 'u1', older)], windows);
    expect(split.eligible).toBe(true);
    expect(split.current.map((row) => row.id)).toEqual(['old']);
    expect(split.periodStart).toEqual(windows.eligibilityStart);
  });

  it('rejects interviews older than the eligibility window', () => {
    const windows = weeklyDigestWindows(NOW);
    const tooOld = new Date(windows.lookbackStart.getTime() + 86400000).toISOString();
    const stillTooOldForEligibility = new Date(
      windows.eligibilityStart.getTime() - 86400000,
    ).toISOString();
    const split = splitDigestWindows(
      [interview('x', 'u1', tooOld), interview('y', 'u1', stillTooOldForEligibility)],
      windows,
    );
    expect(split.eligible).toBe(false);
    expect(split.current).toEqual([]);
  });
});

describe('averageScoresFromPrefetch', () => {
  it('matches the previous report + script + V1-sample average', () => {
    const bundle = emptyBundle({
      reportOveralls: [{ interview_id: 'i1', overall: 8 }],
      scriptRows: [
        {
          interview_id: 'i1',
          overall: 6,
          dims: {
            communication_clarity: 6,
            technical_depth: 6,
            answer_structure: 6,
            confidence: 6,
            relevance: 6,
          },
        },
      ],
      v1Evals: [
        {
          interview_id: 'i1',
          scores: {
            communication_clarity: 4,
            technical_depth: 4,
            answer_structure: 4,
            confidence: 4,
            relevance: 4,
          },
        },
        {
          interview_id: 'i1',
          scores: {
            communication_clarity: 8,
            technical_depth: 8,
            answer_structure: 8,
            confidence: 8,
            relevance: 8,
          },
        },
      ],
    });

    const agg = averageScoresFromPrefetch(['i1'], bundle);
    expect(agg).not.toBeNull();
    expect(agg?.overallAvg10).toBe(7);
    // script sample 6 + V1 average of (4,8)=6 → mean 6
    expect(agg?.dimensions.communication_clarity).toBe(6);
  });

  it('ignores other interview ids and missing overalls', () => {
    const bundle = emptyBundle({
      reportOveralls: [{ interview_id: 'other', overall: 9 }],
    });
    expect(averageScoresFromPrefetch(['i1'], bundle)).toBeNull();
    expect(averageScoresFromPrefetch([], bundle)).toBeNull();
  });
});

describe('averageV1DimensionsForInterviewIds', () => {
  it('averages only the requested interview evaluations', () => {
    const dims = averageV1DimensionsForInterviewIds(
      ['keep'],
      [
        {
          interview_id: 'keep',
          scores: {
            communication_clarity: 2,
            technical_depth: 2,
            answer_structure: 2,
            confidence: 2,
            relevance: 2,
          },
        },
        {
          interview_id: 'drop',
          scores: {
            communication_clarity: 10,
            technical_depth: 10,
            answer_structure: 10,
            confidence: 10,
            relevance: 10,
          },
        },
      ],
    );
    expect(dims?.communication_clarity).toBe(2);
  });
});

describe('estimateWeeklyDigestQueryCount', () => {
  it('drops per-user reads to a chunked constant', () => {
    const plan = estimateWeeklyDigestQueryCount({
      subscribedUsers: 500,
      eligibleUsers: 40,
      interviewRows: 80,
      questionRows: 200,
      answerRows: 200,
    });
    expect(plan.beforeWorst).toBe(1 + 500 * 12);
    expect(plan.after).toBe(1 + 1 + 1 + 1 + 1 + 1 + 2 + 2);
    expect(plan.after).toBeLessThan(20);
    expect(plan.after).toBeLessThan(plan.beforeWorst / 50);
  });
});

describe('prefetchWeeklyDigestBundle', () => {
  it('loads eligible users once and skips the all-users scan', async () => {
    const windows = weeklyDigestWindows(NOW);
    const recent = new Date(windows.statsStart.getTime() + 86400000).toISOString();
    const tables: string[] = [];

    const supabase = {
      from(table: string) {
        tables.push(table);
        const resultFor = () => {
          if (table === 'interviews') {
            return {
              data: [
                {
                  id: 'i1',
                  user_id: 'u1',
                  completed_at: recent,
                  started_at: recent,
                  engine: 'v2.1',
                },
              ],
              error: null,
            };
          }
          if (table === 'users') {
            return {
              data: [{ id: 'u1', email: 'a@example.com', name: 'Ada' }],
              error: null,
            };
          }
          if (table === 'user_progress') {
            return { data: [{ user_id: 'u1', current_streak: 3 }], error: null };
          }
          if (table === 'reports') {
            return { data: [{ interview_id: 'i1', overall_score: 7.5 }], error: null };
          }
          if (table === 'script_interview_reports') {
            return { data: [], error: null };
          }
          if (table === 'questions') {
            return { data: [], error: null };
          }
          return { data: [], error: null };
        };
        const result = resultFor();
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = self;
        chain.eq = self;
        chain.in = self;
        chain.gte = self;
        chain.then = (
          onFulfilled?: (value: { data: unknown; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(onFulfilled, onRejected);
        return chain;
      },
    };

    const bundle = await prefetchWeeklyDigestBundle(supabase, windows);
    expect(bundle).not.toBeNull();
    expect(bundle?.users).toEqual([
      { id: 'u1', email: 'a@example.com', name: 'Ada' },
    ]);
    expect(bundle?.streakByUser.get('u1')).toBe(3);
    expect(bundle?.reportOveralls).toEqual([{ interview_id: 'i1', overall: 7.5 }]);
    expect(tables.filter((name) => name === 'users')).toHaveLength(1);
    expect(tables.filter((name) => name === 'interviews')).toHaveLength(1);
    expect(tables.includes('answers')).toBe(false);
    expect(tables.includes('evaluations')).toBe(false);
  });

  it('batches V1 question/answer/evaluation hops instead of per-interview reads', async () => {
    const windows = weeklyDigestWindows(NOW);
    const recent = new Date(windows.statsStart.getTime() + 86400000).toISOString();
    const tables: string[] = [];

    const supabase = {
      from(table: string) {
        tables.push(table);
        const resultFor = () => {
          if (table === 'interviews') {
            return {
              data: [
                {
                  id: 'i1',
                  user_id: 'u1',
                  completed_at: recent,
                  started_at: recent,
                  engine: 'v1',
                },
                {
                  id: 'i2',
                  user_id: 'u1',
                  completed_at: recent,
                  started_at: recent,
                  engine: 'v1',
                },
              ],
              error: null,
            };
          }
          if (table === 'users') {
            return {
              data: [{ id: 'u1', email: 'a@example.com', name: 'Ada' }],
              error: null,
            };
          }
          if (table === 'user_progress') {
            return { data: [{ user_id: 'u1', current_streak: 1 }], error: null };
          }
          if (table === 'questions') {
            return {
              data: [
                { id: 'q1', interview_id: 'i1' },
                { id: 'q2', interview_id: 'i2' },
              ],
              error: null,
            };
          }
          if (table === 'answers') {
            return {
              data: [
                { id: 'a1', question_id: 'q1' },
                { id: 'a2', question_id: 'q2' },
              ],
              error: null,
            };
          }
          if (table === 'evaluations') {
            return {
              data: [
                {
                  answer_id: 'a1',
                  dimension_scores: {
                    communication_clarity: 5,
                    technical_depth: 5,
                    answer_structure: 5,
                    confidence: 5,
                    relevance: 5,
                  },
                },
              ],
              error: null,
            };
          }
          return { data: [], error: null };
        };
        const result = resultFor();
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = self;
        chain.eq = self;
        chain.in = self;
        chain.gte = self;
        chain.then = (
          onFulfilled?: (value: { data: unknown; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => Promise.resolve(result).then(onFulfilled, onRejected);
        return chain;
      },
    };

    const bundle = await prefetchWeeklyDigestBundle(supabase, windows);
    expect(bundle?.v1Evals).toHaveLength(1);
    expect(tables.filter((name) => name === 'questions')).toHaveLength(1);
    expect(tables.filter((name) => name === 'answers')).toHaveLength(1);
    expect(tables.filter((name) => name === 'evaluations')).toHaveLength(1);
    expect(tables.filter((name) => name === 'interviews')).toHaveLength(1);
  });
});
