import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import type { DimensionScores } from '@/types/app.types';
import { getEmailAppUrl } from '@/lib/server/get-base-url';
import type { WeeklyProgressEmailProps } from '@/emails/WeeklyProgressEmail';
import type { WeeklyDimensionScores } from '@/emails/utils/weeklyHelpers';
import { sendLifecycleTemplate } from '@/lib/email/lifecycle/send-template';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import { getDefaultInterviewStartUrl } from '@/lib/interview/default-interview-start-path';

// ─── Unsubscribe token helpers ────────────────────────────────────────────────

export function generateUnsubToken(userId: string): string {
  if (!process.env.UNSUBSCRIBE_SECRET) {
    throw new Error('UNSUBSCRIBE_SECRET env var is not set');
  }
  return createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest('hex');
}

export function verifyUnsubToken(userId: string, token: string): boolean {
  try {
    const expected = Buffer.from(generateUnsubToken(userId), 'hex');
    const actual = Buffer.from(token, 'hex');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ─── Digest data types ────────────────────────────────────────────────────────

interface DigestUser {
  id: string;
  email: string;
  name: string | null;
}

interface DigestData {
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
}

/** Users who completed an interview in this window receive the weekly mail. */
const ELIGIBILITY_DAYS = 30;
/** Preferred stats window for the weekly rollup. */
const STATS_DAYS = 7;

const V1_DIM_KEYS: (keyof DimensionScores)[] = [
  'communication_clarity',
  'technical_depth',
  'answer_structure',
  'confidence',
  'relevance',
];

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function weekIdempotencyKey(userId: string, weekStart: Date): string {
  return `weekly:${userId}:${weekStart.toISOString().slice(0, 10)}`;
}

function scaleDimension(score10: number): number {
  return Math.round(score10 * 10);
}

function emptyDimensionSums(): DimensionScores {
  return {
    communication_clarity: 0,
    technical_depth: 0,
    answer_structure: 0,
    confidence: 0,
    relevance: 0,
  };
}

/** Map score-v1.2 script dims onto the weekly email's v1-shaped slots. */
function scriptDimsToWeeklyShape(
  dims: Record<DimensionKey, number>,
): DimensionScores {
  return {
    communication_clarity: dims.communication_clarity,
    technical_depth: dims.content_accuracy,
    answer_structure: dims.structure,
    confidence: dims.specificity,
    relevance: dims.relevance,
  };
}

async function averageV1DimensionsForInterviews(
  supabase: ReturnType<typeof createServiceClient>,
  interviewIds: string[],
): Promise<DimensionScores | null> {
  if (interviewIds.length === 0) return null;

  const { data: questions } = await supabase
    .from('questions')
    .select('id')
    .in('interview_id', interviewIds);

  if (!questions || questions.length === 0) return null;

  const questionIds = questions.map((q) => q.id as string);
  const { data: answers } = await supabase
    .from('answers')
    .select('id')
    .in('question_id', questionIds);

  if (!answers || answers.length === 0) return null;

  const answerIds = answers.map((a) => a.id as string);
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('dimension_scores')
    .in('answer_id', answerIds);

  if (!evaluations || evaluations.length === 0) return null;

  const sums = emptyDimensionSums();
  for (const ev of evaluations) {
    const d = ev.dimension_scores as DimensionScores;
    for (const key of V1_DIM_KEYS) {
      sums[key] += d[key] ?? 0;
    }
  }

  const n = evaluations.length;
  return {
    communication_clarity: sums.communication_clarity / n,
    technical_depth: sums.technical_depth / n,
    answer_structure: sums.answer_structure / n,
    confidence: sums.confidence / n,
    relevance: sums.relevance / n,
  };
}

async function averageScoresForInterviews(
  supabase: ReturnType<typeof createServiceClient>,
  interviewIds: string[],
): Promise<{ overallAvg10: number; dimensions: DimensionScores } | null> {
  if (interviewIds.length === 0) return null;

  const [{ data: v1Reports }, { data: scriptReports }] = await Promise.all([
    supabase.from('reports').select('interview_id, overall_score').in('interview_id', interviewIds),
    supabase
      .from('script_interview_reports')
      .select('interview_id, overall, dimension_averages, status')
      .in('interview_id', interviewIds)
      .in('status', ['ready', 'partial']),
  ]);

  const overalls: number[] = [];
  const dimSamples: DimensionScores[] = [];

  for (const r of v1Reports ?? []) {
    if (typeof r.overall_score === 'number') overalls.push(r.overall_score);
  }

  for (const r of scriptReports ?? []) {
    if (r.overall == null) continue;
    overalls.push(Number(r.overall));
    const raw = r.dimension_averages as Record<string, number> | null;
    if (raw && typeof raw === 'object') {
      const mapped = {} as Record<DimensionKey, number>;
      let ok = true;
      for (const key of DIMENSION_KEYS) {
        if (typeof raw[key] !== 'number') {
          ok = false;
          break;
        }
        mapped[key] = raw[key];
      }
      if (ok) dimSamples.push(scriptDimsToWeeklyShape(mapped));
    }
  }

  if (overalls.length === 0) return null;

  const v1Dims = await averageV1DimensionsForInterviews(supabase, interviewIds);
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
    overallAvg10: overalls.reduce((s, n) => s + n, 0) / overalls.length,
    dimensions,
  };
}

function toWeeklyDimensions(
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

async function buildUserDigest(user: DigestUser): Promise<DigestData | null> {
  const supabase = createServiceClient();
  const now = new Date();

  const eligibilityStart = new Date(now);
  eligibilityStart.setDate(now.getDate() - ELIGIBILITY_DAYS);
  eligibilityStart.setHours(0, 0, 0, 0);

  const statsStart = new Date(now);
  statsStart.setDate(now.getDate() - STATS_DAYS);
  statsStart.setHours(0, 0, 0, 0);

  const prevStatsStart = new Date(statsStart);
  prevStatsStart.setDate(prevStatsStart.getDate() - STATS_DAYS);

  // Look back far enough for eligibility + previous stats window.
  const lookbackStart = new Date(now);
  lookbackStart.setDate(now.getDate() - ELIGIBILITY_DAYS - STATS_DAYS);
  lookbackStart.setHours(0, 0, 0, 0);

  const { data: allInterviews } = await supabase
    .from('interviews')
    .select('id, completed_at, started_at, engine')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('completed_at', lookbackStart.toISOString())
    .order('completed_at', { ascending: false });

  if (!allInterviews || allInterviews.length === 0) return null;

  const eligible = allInterviews.some(
    (i) => new Date(i.completed_at as string) >= eligibilityStart,
  );
  if (!eligible) return null;

  let currentInterviews = allInterviews.filter(
    (i) => new Date(i.completed_at as string) >= statsStart,
  );
  let previousInterviews = allInterviews.filter((i) => {
    const t = new Date(i.completed_at as string);
    return t >= prevStatsStart && t < statsStart;
  });

  // No practice in the last 7 days — fall back to last-30-day rollup so eligible
  // candidates still get a weekly nudge with real scores.
  let periodStart = statsStart;
  if (currentInterviews.length === 0) {
    currentInterviews = allInterviews.filter(
      (i) => new Date(i.completed_at as string) >= eligibilityStart,
    );
    periodStart = eligibilityStart;
    const prevEligibilityStart = new Date(eligibilityStart);
    prevEligibilityStart.setDate(prevEligibilityStart.getDate() - ELIGIBILITY_DAYS);
    previousInterviews = allInterviews.filter((i) => {
      const t = new Date(i.completed_at as string);
      return t >= prevEligibilityStart && t < eligibilityStart;
    });
  }

  if (currentInterviews.length === 0) return null;

  const currentIds = currentInterviews.map((i) => i.id as string);
  const previousIds = previousInterviews.map((i) => i.id as string);

  const [currentAgg, previousAgg] = await Promise.all([
    averageScoresForInterviews(supabase, currentIds),
    averageScoresForInterviews(supabase, previousIds),
  ]);

  if (!currentAgg) return null;

  const dimensions = toWeeklyDimensions(
    currentAgg.dimensions,
    previousAgg?.dimensions ?? null,
  );

  let practiceMinutes = 0;
  for (const interview of currentInterviews) {
    const started = interview.started_at
      ? new Date(interview.started_at as string)
      : null;
    const completed = new Date(interview.completed_at as string);
    if (started) {
      practiceMinutes += Math.max(1, Math.round((completed.getTime() - started.getTime()) / 60000));
    } else {
      practiceMinutes += 15;
    }
  }

  const { data: progress } = await supabase
    .from('user_progress')
    .select('current_streak')
    .eq('user_id', user.id)
    .maybeSingle();

  const baseUrl = getEmailAppUrl();
  const unsubToken = generateUnsubToken(user.id);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?userId=${encodeURIComponent(user.id)}&token=${unsubToken}`;

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() - 1);

  const candidateName = user.name?.trim() || 'there';
  const currentWeekScore = scaleDimension(currentAgg.overallAvg10);
  const previousWeekScore = scaleDimension(
    previousAgg?.overallAvg10 ?? currentAgg.overallAvg10,
  );

  const templateProps: WeeklyProgressEmailProps = {
    candidateName,
    weekStart: formatShortDate(periodStart),
    weekEnd: formatShortDate(weekEnd),
    streak: (progress?.current_streak as number) ?? 0,
    interviewsCompleted: currentInterviews.length,
    practiceMinutes,
    previousWeekScore,
    currentWeekScore,
    dimensions,
    reportUrl: `${baseUrl}/dashboard`,
    practiceUrl: getDefaultInterviewStartUrl(baseUrl),
    unsubscribeUrl,
  };

  return {
    user,
    weekStart: formatShortDate(periodStart),
    weekEnd: formatShortDate(weekEnd),
    lastWeekCount: currentInterviews.length,
    practiceMinutes,
    currentWeekScore,
    previousWeekScore,
    dimensions,
    streak: templateProps.streak,
    templateProps,
    idempotencyKey: weekIdempotencyKey(user.id, statsStart),
  };
}

async function sendDigest(data: DigestData): Promise<boolean> {
  const result = await sendLifecycleTemplate({
    template: 'weekly_progress',
    to: data.user.email,
    userId: data.user.id,
    idempotencyKey: data.idempotencyKey,
    props: data.templateProps as unknown as Record<string, unknown>,
    text: `Your weekly InterviewEra progress: ${data.lastWeekCount} interviews, avg score ${data.currentWeekScore}/100.`,
  });

  if (!result.sent && !result.skipped) {
    console.error(`[weekly-digest] Failed to send to ${data.user.email}:`, result.error);
    return false;
  }

  return result.sent;
}

export async function runWeeklyDigest(): Promise<{ sent: number; skipped: number }> {
  const supabase = createServiceClient();

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email_digest_unsubscribed', false);

  if (error || !users) {
    console.error('[weekly-digest] Failed to fetch users:', error);
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.email?.trim()) {
      skipped++;
      continue;
    }
    const digestData = await buildUserDigest(user as DigestUser);
    if (!digestData) {
      skipped++;
      continue;
    }
    const delivered = await sendDigest(digestData);
    if (delivered) {
      sent++;
    } else {
      skipped++;
    }
  }

  return { sent, skipped };
}
