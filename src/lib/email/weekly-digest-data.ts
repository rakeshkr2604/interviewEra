/**
 * Weekly-digest read path — prefetch once, aggregate in memory.
 *
 * Cron used to load every subscribed user, then run 7–12 PostgREST queries
 * per user. Eligible recipients are users who completed an interview in the
 * last 30 days; the rest never need a digest. This module loads the lookback
 * window once and keeps send/idempotency sequential.
 */

import type { DimensionScores } from '@/types/app.types';
import type { WeeklyProgressEmailProps } from '@/emails/WeeklyProgressEmail';
import type { WeeklyDimensionScores } from '@/emails/utils/weeklyHelpers';
import { chunkIds } from '@/lib/dashboard/id-chunks';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import { scriptDimsToV1Shape } from '@/lib/interview/script-dimension-bridge';

export const WEEKLY_DIGEST_ELIGIBILITY_DAYS = 30;
export const WEEKLY_DIGEST_STATS_DAYS = 7;

export type DigestUser = {
  id: string;
  email: string;
  name: string | null;
};

export type DigestInterviewRow = {
  id: string;
  user_id: string;
  completed_at: string;
  started_at: string | null;
  engine: string | null;
};

export type WeeklyDigestWindows = {
  now: Date;
  eligibilityStart: Date;
  statsStart: Date;
  prevStatsStart: Date;
  lookbackStart: Date;
};

export type DigestScoreAggregate = {
  overallAvg10: number;
  dimensions: DimensionScores;
};

export type DigestPayload = {
  user: DigestUser;
  weekStart: string;
  weekEnd: string;
  lastWeekCount: number;
  practiceMinutes: number;
  currentWeekScore: number;
  previousWeekScore: number;
  dimensions: WeeklyDimensionScores;
  streak: number;
  templateProps: WeeklyProgressEmailProps;
  idempotencyKey: string;
};

export type DigestUrlContext = {
  baseUrl: string;
  practiceUrl: string;
  unsubscribeUrl: string;
};

export type DigestClient = {
  from: (table: string) => unknown;
};

type ReportOverallRow = { interview_id: string; overall: number };
type ScriptPrefetchRow = {
  interview_id: string;
  overall: number;
  dims: DimensionScores | null;
};
type V1EvalRow = { interview_id: string; scores: DimensionScores };

export type WeeklyDigestBundle = {
  interviewsByUser: Map<string, DigestInterviewRow[]>;
  users: DigestUser[];
  streakByUser: Map<string, number>;
  reportOveralls: ReportOverallRow[];
  scriptRows: ScriptPrefetchRow[];
  v1Evals: V1EvalRow[];
};

const V1_DIM_KEYS: (keyof DimensionScores)[] = [
  'communication_clarity',
  'technical_depth',
  'answer_structure',
  'confidence',
  'relevance',
];

export function emptyDimensionSums(): DimensionScores {
  return {
    communication_clarity: 0,
    technical_depth: 0,
    answer_structure: 0,
    confidence: 0,
    relevance: 0,
  };
}

function scriptDimsToWeeklyShape(
  dims: Record<DimensionKey, number>,
): DimensionScores {
  return scriptDimsToV1Shape(dims);
}

/** Same local-midnight windows as the previous per-user builder. */
export function weeklyDigestWindows(now = new Date()): WeeklyDigestWindows {
  const eligibilityStart = new Date(now);
  eligibilityStart.setDate(now.getDate() - WEEKLY_DIGEST_ELIGIBILITY_DAYS);
  eligibilityStart.setHours(0, 0, 0, 0);

  const statsStart = new Date(now);
  statsStart.setDate(now.getDate() - WEEKLY_DIGEST_STATS_DAYS);
  statsStart.setHours(0, 0, 0, 0);

  const prevStatsStart = new Date(statsStart);
  prevStatsStart.setDate(prevStatsStart.getDate() - WEEKLY_DIGEST_STATS_DAYS);

  const lookbackStart = new Date(now);
  lookbackStart.setDate(
    now.getDate() - WEEKLY_DIGEST_ELIGIBILITY_DAYS - WEEKLY_DIGEST_STATS_DAYS,
  );
  lookbackStart.setHours(0, 0, 0, 0);

  return { now, eligibilityStart, statsStart, prevStatsStart, lookbackStart };
}

export function splitDigestWindows(
  interviews: readonly DigestInterviewRow[],
  windows: WeeklyDigestWindows,
): {
  eligible: boolean;
  current: DigestInterviewRow[];
  previous: DigestInterviewRow[];
  periodStart: Date;
} {
  const eligible = interviews.some(
    (row) => new Date(row.completed_at) >= windows.eligibilityStart,
  );
  if (!eligible) {
    return {
      eligible: false,
      current: [],
      previous: [],
      periodStart: windows.statsStart,
    };
  }

  let current = interviews.filter(
    (row) => new Date(row.completed_at) >= windows.statsStart,
  );
  let previous = interviews.filter((row) => {
    const t = new Date(row.completed_at);
    return t >= windows.prevStatsStart && t < windows.statsStart;
  });
  let periodStart = windows.statsStart;

  if (current.length === 0) {
    current = interviews.filter(
      (row) => new Date(row.completed_at) >= windows.eligibilityStart,
    );
    periodStart = windows.eligibilityStart;
    const prevEligibilityStart = new Date(windows.eligibilityStart);
    prevEligibilityStart.setDate(
      prevEligibilityStart.getDate() - WEEKLY_DIGEST_ELIGIBILITY_DAYS,
    );
    previous = interviews.filter((row) => {
      const t = new Date(row.completed_at);
      return t >= prevEligibilityStart && t < windows.eligibilityStart;
    });
  }

  return { eligible: current.length > 0, current, previous, periodStart };
}

export function formatDigestShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function weekIdempotencyKey(userId: string, weekStart: Date): string {
  return `weekly:${userId}:${weekStart.toISOString().slice(0, 10)}`;
}

export function scaleDimension(score10: number): number {
  return Math.round(score10 * 10);
}

export function toWeeklyDimensions(
  current: DimensionScores | null,
  previous: DimensionScores | null,
): WeeklyDimensionScores {
  const cur = current ?? emptyDimensionSums();
  const prev = previous ?? emptyDimensionSums();
  return {
    communication: {
      current: scaleDimension(cur.communication_clarity),
      previous: scaleDimension(prev.communication_clarity),
    },
    technical: {
      current: scaleDimension(cur.technical_depth),
      previous: scaleDimension(prev.technical_depth),
    },
    confidence: {
      current: scaleDimension(cur.confidence),
      previous: scaleDimension(prev.confidence),
    },
    problemSolving: {
      current: scaleDimension(cur.relevance),
      previous: scaleDimension(prev.relevance),
    },
    structure: {
      current: scaleDimension(cur.answer_structure),
      previous: scaleDimension(prev.answer_structure),
    },
  };
}

export function practiceMinutesForInterviews(
  interviews: readonly DigestInterviewRow[],
): number {
  let practiceMinutes = 0;
  for (const interview of interviews) {
    const started = interview.started_at ? new Date(interview.started_at) : null;
    const completed = new Date(interview.completed_at);
    if (started) {
      practiceMinutes += Math.max(
        1,
        Math.round((completed.getTime() - started.getTime()) / 60000),
      );
    } else {
      practiceMinutes += 15;
    }
  }
  return practiceMinutes;
}

export function buildUserDigestFromBundle(
  user: DigestUser,
  bundle: WeeklyDigestBundle,
  windows: WeeklyDigestWindows,
  urls: DigestUrlContext,
): DigestPayload | null {
  const allInterviews = bundle.interviewsByUser.get(user.id) ?? [];
  const split = splitDigestWindows(allInterviews, windows);
  if (!split.eligible || split.current.length === 0) return null;

  const currentAgg = averageScoresFromPrefetch(
    split.current.map((row) => row.id),
    bundle,
  );
  if (!currentAgg) return null;

  const previousAgg = averageScoresFromPrefetch(
    split.previous.map((row) => row.id),
    bundle,
  );
  const dimensions = toWeeklyDimensions(
    currentAgg.dimensions,
    previousAgg?.dimensions ?? null,
  );
  const practiceMinutes = practiceMinutesForInterviews(split.current);
  const weekEnd = new Date(windows.now);
  weekEnd.setDate(weekEnd.getDate() - 1);
  const currentWeekScore = scaleDimension(currentAgg.overallAvg10);
  const previousWeekScore = scaleDimension(
    previousAgg?.overallAvg10 ?? currentAgg.overallAvg10,
  );
  const templateProps: WeeklyProgressEmailProps = {
    candidateName: user.name?.trim() || 'there',
    weekStart: formatDigestShortDate(split.periodStart),
    weekEnd: formatDigestShortDate(weekEnd),
    streak: bundle.streakByUser.get(user.id) ?? 0,
    interviewsCompleted: split.current.length,
    practiceMinutes,
    previousWeekScore,
    currentWeekScore,
    dimensions,
    reportUrl: `${urls.baseUrl}/dashboard`,
    practiceUrl: urls.practiceUrl,
    unsubscribeUrl: urls.unsubscribeUrl,
  };

  return {
    user,
    weekStart: formatDigestShortDate(split.periodStart),
    weekEnd: formatDigestShortDate(weekEnd),
    lastWeekCount: split.current.length,
    practiceMinutes,
    currentWeekScore,
    previousWeekScore,
    dimensions,
    streak: templateProps.streak,
    templateProps,
    idempotencyKey: weekIdempotencyKey(user.id, windows.statsStart),
  };
}

export function estimateWeeklyDigestQueryCount(opts: {
  subscribedUsers: number;
  eligibleUsers: number;
  interviewRows: number;
  questionRows: number;
  answerRows: number;
}): { beforeWorst: number; after: number } {
  const subscribed = Math.max(0, opts.subscribedUsers);
  const eligible = Math.max(0, opts.eligibleUsers);
  const interviews = Math.max(0, opts.interviewRows);
  const questions = Math.max(0, opts.questionRows);
  const answers = Math.max(0, opts.answerRows);
  const chunk = (n: number) => (n === 0 ? 0 : Math.ceil(n / 100));

  // 1 users list + per user: interviews + 2 report pairs + up to 2×3 V1 hops + progress
  const beforeWorst = 1 + subscribed * (1 + 4 + 6 + 1);
  const after =
    1 +
    chunk(eligible) +
    chunk(eligible) +
    chunk(interviews) +
    chunk(interviews) +
    chunk(interviews) +
    chunk(questions) +
    chunk(answers);

  return { beforeWorst, after };
}

async function selectInChunks<T>(
  ids: readonly string[],
  fetchChunk: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const out: T[] = [];
  for (const chunk of chunkIds([...ids])) {
    out.push(...(await fetchChunk(chunk)));
  }
  return out;
}

type QueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type FilterBuilder<T> = {
  select: (columns: string) => FilterBuilder<T>;
  eq: (column: string, value: string | boolean) => FilterBuilder<T>;
  in: (column: string, values: readonly string[]) => FilterBuilder<T>;
  gte: (column: string, value: string) => FilterBuilder<T>;
} & PromiseLike<QueryResult<T>>;

function fromTable<T>(supabase: DigestClient, table: string): FilterBuilder<T> {
  return supabase.from(table) as FilterBuilder<T>;
}

export function averageV1DimensionsForInterviewIds(
  interviewIds: readonly string[],
  evals: readonly V1EvalRow[],
): DimensionScores | null {
  if (interviewIds.length === 0) return null;
  const wanted = new Set(interviewIds);
  const sums = emptyDimensionSums();
  let n = 0;
  for (const row of evals) {
    if (!wanted.has(row.interview_id)) continue;
    n += 1;
    for (const key of V1_DIM_KEYS) {
      sums[key] += row.scores[key] ?? 0;
    }
  }
  if (n === 0) return null;
  return {
    communication_clarity: sums.communication_clarity / n,
    technical_depth: sums.technical_depth / n,
    answer_structure: sums.answer_structure / n,
    confidence: sums.confidence / n,
    relevance: sums.relevance / n,
  };
}

export function averageScoresFromPrefetch(
  interviewIds: readonly string[],
  bundle: Pick<WeeklyDigestBundle, 'reportOveralls' | 'scriptRows' | 'v1Evals'>,
): DigestScoreAggregate | null {
  if (interviewIds.length === 0) return null;
  const wanted = new Set(interviewIds);
  return averageScoresFromPrefetchRows(interviewIds, {
    v1Overalls: bundle.reportOveralls.filter((row) => wanted.has(row.interview_id)),
    scriptRows: bundle.scriptRows.filter((row) => wanted.has(row.interview_id)),
    v1Evals: bundle.v1Evals,
  });
}

export function averageScoresFromPrefetchRows(
  interviewIds: readonly string[],
  rows: {
    v1Overalls: readonly ReportOverallRow[];
    scriptRows: readonly ScriptPrefetchRow[];
    v1Evals: readonly V1EvalRow[];
  },
): DigestScoreAggregate | null {
  if (interviewIds.length === 0) return null;

  const overalls: number[] = [];
  const dimSamples: DimensionScores[] = [];

  for (const row of rows.v1Overalls) {
    overalls.push(row.overall);
  }
  for (const row of rows.scriptRows) {
    overalls.push(row.overall);
    if (row.dims) dimSamples.push(row.dims);
  }

  if (overalls.length === 0) return null;

  const v1Dims = averageV1DimensionsForInterviewIds(interviewIds, rows.v1Evals);
  if (v1Dims) dimSamples.push(v1Dims);

  let dimensions = emptyDimensionSums();
  if (dimSamples.length > 0) {
    for (const sample of dimSamples) {
      for (const key of V1_DIM_KEYS) {
        dimensions[key] += sample[key];
      }
    }
    const n = dimSamples.length;
    dimensions = {
      communication_clarity: dimensions.communication_clarity / n,
      technical_depth: dimensions.technical_depth / n,
      answer_structure: dimensions.answer_structure / n,
      confidence: dimensions.confidence / n,
      relevance: dimensions.relevance / n,
    };
  }

  return {
    overallAvg10: overalls.reduce((sum, value) => sum + value, 0) / overalls.length,
    dimensions,
  };
}

function parseScriptRow(
  interviewId: string,
  overall: unknown,
  raw: unknown,
): ScriptPrefetchRow | null {
  if (overall == null) return null;
  const overallNumber = Number(overall);
  if (!Number.isFinite(overallNumber)) return null;

  let dims: DimensionScores | null = null;
  if (raw && typeof raw === 'object') {
    const mapped = {} as Record<DimensionKey, number>;
    let ok = true;
    for (const key of DIMENSION_KEYS) {
      if (typeof (raw as Record<string, unknown>)[key] !== 'number') {
        ok = false;
        break;
      }
      mapped[key] = (raw as Record<string, number>)[key];
    }
    if (ok) dims = scriptDimsToWeeklyShape(mapped);
  }

  return { interview_id: interviewId, overall: overallNumber, dims };
}

export async function prefetchWeeklyDigestBundle(
  supabase: DigestClient,
  windows: WeeklyDigestWindows,
): Promise<WeeklyDigestBundle | null> {
  const interviewResult = await fromTable<Record<string, unknown>>(
    supabase,
    'interviews',
  )
    .select('id, user_id, completed_at, started_at, engine')
    .eq('status', 'completed')
    .gte('completed_at', windows.lookbackStart.toISOString());

  if (interviewResult.error) {
    console.error('[weekly-digest] Failed to fetch interviews:', interviewResult.error);
    return null;
  }

  const interviews: DigestInterviewRow[] = (interviewResult.data ?? [])
    .map((row) => ({
      id: String(row.id ?? ''),
      user_id: String(row.user_id ?? ''),
      completed_at: String(row.completed_at ?? ''),
      started_at: typeof row.started_at === 'string' ? row.started_at : null,
      engine: typeof row.engine === 'string' ? row.engine : null,
    }))
    .filter((row) => row.id && row.user_id && row.completed_at);

  if (interviews.length === 0) return null;

  const interviewsByUser = new Map<string, DigestInterviewRow[]>();
  const eligibleUserIds: string[] = [];
  const eligibleSeen = new Set<string>();
  for (const row of interviews) {
    const list = interviewsByUser.get(row.user_id) ?? [];
    list.push(row);
    interviewsByUser.set(row.user_id, list);
    if (
      !eligibleSeen.has(row.user_id) &&
      new Date(row.completed_at) >= windows.eligibilityStart
    ) {
      eligibleSeen.add(row.user_id);
      eligibleUserIds.push(row.user_id);
    }
  }

  if (eligibleUserIds.length === 0) return null;

  const users = await selectInChunks(eligibleUserIds, async (chunk) => {
    const result = await fromTable<DigestUser>(supabase, 'users')
      .select('id, email, name')
      .in('id', chunk)
      .eq('email_digest_unsubscribed', false);
    if (result.error) {
      console.error('[weekly-digest] Failed to fetch users:', result.error);
      return [];
    }
    return (result.data ?? []).filter((user) => Boolean(user.id));
  });

  const streakByUser = new Map<string, number>();
  const progressRows = await selectInChunks(eligibleUserIds, async (chunk) => {
    const result = await fromTable<{
      user_id: string;
      current_streak: number | null;
    }>(supabase, 'user_progress')
      .select('user_id, current_streak')
      .in('user_id', chunk);
    return result.data ?? [];
  });
  for (const row of progressRows) {
    streakByUser.set(row.user_id, row.current_streak ?? 0);
  }

  const interviewIds = interviews.map((row) => row.id);
  const reportOveralls = await selectInChunks(interviewIds, async (chunk) => {
    const result = await fromTable<{
      interview_id: string;
      overall_score: number | null;
    }>(supabase, 'reports')
      .select('interview_id, overall_score')
      .in('interview_id', chunk);
    return (result.data ?? [])
      .filter((row) => typeof row.overall_score === 'number')
      .map((row) => ({
        interview_id: row.interview_id,
        overall: row.overall_score as number,
      }));
  });

  const scriptRows = await selectInChunks(interviewIds, async (chunk) => {
    const result = await fromTable<{
      interview_id: string;
      overall: number | null;
      dimension_averages: Record<string, number> | null;
    }>(supabase, 'script_interview_reports')
      .select('interview_id, overall, dimension_averages, status')
      .in('interview_id', chunk)
      .in('status', ['ready', 'partial']);
    const parsed: ScriptPrefetchRow[] = [];
    for (const row of result.data ?? []) {
      const mapped = parseScriptRow(
        row.interview_id,
        row.overall,
        row.dimension_averages,
      );
      if (mapped) parsed.push(mapped);
    }
    return parsed;
  });

  const v1Evals = await prefetchV1Evaluations(supabase, interviewIds);

  return {
    interviewsByUser,
    users,
    streakByUser,
    reportOveralls,
    scriptRows,
    v1Evals,
  };
}

async function prefetchV1Evaluations(
  supabase: DigestClient,
  interviewIds: readonly string[],
): Promise<V1EvalRow[]> {
  const questions = await selectInChunks(interviewIds, async (chunk) => {
    const result = await fromTable<{ id: string; interview_id: string }>(
      supabase,
      'questions',
    )
      .select('id, interview_id')
      .in('interview_id', chunk);
    return result.data ?? [];
  });
  if (questions.length === 0) return [];

  const questionToInterview = new Map(
    questions.map((row) => [row.id, row.interview_id]),
  );
  const answers = await selectInChunks(
    questions.map((row) => row.id),
    async (chunk) => {
      const result = await fromTable<{ id: string; question_id: string }>(
        supabase,
        'answers',
      )
        .select('id, question_id')
        .in('question_id', chunk);
      return result.data ?? [];
    },
  );
  if (answers.length === 0) return [];

  const answerToInterview = new Map<string, string>();
  for (const answer of answers) {
    const interviewId = questionToInterview.get(answer.question_id);
    if (interviewId) answerToInterview.set(answer.id, interviewId);
  }

  const evaluations = await selectInChunks(
    answers.map((row) => row.id),
    async (chunk) => {
      const result = await fromTable<{
        answer_id: string;
        dimension_scores: DimensionScores | null;
      }>(supabase, 'evaluations')
        .select('answer_id, dimension_scores')
        .in('answer_id', chunk);
      return result.data ?? [];
    },
  );

  const out: V1EvalRow[] = [];
  for (const evaluation of evaluations) {
    const interviewId = answerToInterview.get(evaluation.answer_id);
    if (!interviewId || !evaluation.dimension_scores) continue;
    out.push({ interview_id: interviewId, scores: evaluation.dimension_scores });
  }
  return out;
}
