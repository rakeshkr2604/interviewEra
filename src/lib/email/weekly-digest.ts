import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import type { DimensionScores } from '@/types/app.types';
import { getBaseUrl } from '@/lib/server/get-base-url';
import type { WeeklyProgressEmailProps } from '@/emails/WeeklyProgressEmail';
import type { WeeklyDimensionScores } from '@/emails/utils/weeklyHelpers';
import { sendLifecycleTemplate } from '@/lib/email/lifecycle/send-template';

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

const DIM_KEYS: (keyof DimensionScores)[] = [
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

async function averageDimensionsForInterviews(
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
    for (const key of DIM_KEYS) {
      sums[key] += d[key];
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

  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 7);
  lastWeekStart.setHours(0, 0, 0, 0);

  const prevWeekStart = new Date(lastWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const { data: allInterviews } = await supabase
    .from('interviews')
    .select('id, completed_at, started_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('completed_at', prevWeekStart.toISOString())
    .order('completed_at', { ascending: false });

  if (!allInterviews || allInterviews.length === 0) return null;

  const lastWeekInterviews = allInterviews.filter(
    (i) => new Date(i.completed_at as string) >= lastWeekStart,
  );
  const prevWeekInterviews = allInterviews.filter(
    (i) => {
      const t = new Date(i.completed_at as string);
      return t >= prevWeekStart && t < lastWeekStart;
    },
  );

  if (lastWeekInterviews.length === 0) return null;

  const lastWeekIds = lastWeekInterviews.map((i) => i.id as string);
  const prevWeekIds = prevWeekInterviews.map((i) => i.id as string);

  const { data: lastWeekReports } = await supabase
    .from('reports')
    .select('overall_score')
    .in('interview_id', lastWeekIds);

  if (!lastWeekReports || lastWeekReports.length === 0) return null;

  const lastWeekAvg10 =
    lastWeekReports.reduce((s, r) => s + (r.overall_score as number), 0) /
    lastWeekReports.length;

  let prevWeekAvg10 = lastWeekAvg10;
  if (prevWeekIds.length > 0) {
    const { data: prevReports } = await supabase
      .from('reports')
      .select('overall_score')
      .in('interview_id', prevWeekIds);
    if (prevReports && prevReports.length > 0) {
      prevWeekAvg10 =
        prevReports.reduce((s, r) => s + (r.overall_score as number), 0) /
        prevReports.length;
    }
  }

  const [currentDims, previousDims] = await Promise.all([
    averageDimensionsForInterviews(supabase, lastWeekIds),
    averageDimensionsForInterviews(supabase, prevWeekIds),
  ]);

  const dimensions = toWeeklyDimensions(currentDims, previousDims);

  let practiceMinutes = 0;
  for (const interview of lastWeekInterviews) {
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

  const baseUrl = getBaseUrl();
  const unsubToken = generateUnsubToken(user.id);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?userId=${encodeURIComponent(user.id)}&token=${unsubToken}`;

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() - 1);

  const candidateName = user.name?.trim() || 'there';
  const currentWeekScore = scaleDimension(lastWeekAvg10);
  const previousWeekScore = scaleDimension(prevWeekAvg10);

  const templateProps: WeeklyProgressEmailProps = {
    candidateName,
    weekStart: formatShortDate(lastWeekStart),
    weekEnd: formatShortDate(weekEnd),
    streak: (progress?.current_streak as number) ?? 0,
    interviewsCompleted: lastWeekInterviews.length,
    practiceMinutes,
    previousWeekScore,
    currentWeekScore,
    dimensions,
    reportUrl: `${baseUrl}/dashboard`,
    practiceUrl: `${baseUrl}/interview/new`,
    unsubscribeUrl,
  };

  return {
    user,
    weekStart: formatShortDate(lastWeekStart),
    weekEnd: formatShortDate(weekEnd),
    lastWeekCount: lastWeekInterviews.length,
    practiceMinutes,
    currentWeekScore,
    previousWeekScore,
    dimensions,
    streak: templateProps.streak,
    templateProps,
    idempotencyKey: weekIdempotencyKey(user.id, lastWeekStart),
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
