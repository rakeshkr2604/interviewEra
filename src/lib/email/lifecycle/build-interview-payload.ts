import { createServiceClient } from '@/lib/supabase/server';
import type { DimensionScores, DetailedAnalysis, RadarDataPoint } from '@/types/app.types';
import { getBaseUrl } from '@/lib/server/get-base-url';
import type { InterviewCompletedEmailProps } from '@/emails/InterviewCompletedEmail';

function scaleScore(score10: number): number {
  return Math.round(score10 * 10);
}

function radarToEmailScores(radar: RadarDataPoint[]): InterviewCompletedEmailProps['scores'] {
  const byKey = Object.fromEntries(radar.map((r) => [r.dimension, r.score])) as Record<
    string,
    number
  >;
  return {
    communication: scaleScore(byKey.communication_clarity ?? 5),
    technical: scaleScore(byKey.technical_depth ?? 5),
    confidence: scaleScore(byKey.confidence ?? 5),
    problemSolving: scaleScore(byKey.relevance ?? 5),
    structure: scaleScore(byKey.answer_structure ?? 5),
  };
}

function uniqueStrings(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

export async function buildInterviewCompletedEmailPayload(
  interviewId: string,
  userId: string,
  reportId: string,
  overallScore10: number,
  radarData: RadarDataPoint[],
): Promise<InterviewCompletedEmailProps | null> {
  const supabase = createServiceClient();
  const baseUrl = getBaseUrl();

  const { data: user } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle();

  const { data: interview } = await supabase
    .from('interviews')
    .select('id, role, difficulty, started_at, completed_at, session_context, question_count')
    .eq('id', interviewId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!interview) return null;

  const { data: questions } = await supabase
    .from('questions')
    .select('id')
    .eq('interview_id', interviewId);

  const questionIds = (questions ?? []).map((q) => q.id as string);
  let totalQuestions = questionIds.length;
  let followUpQuestions = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actionItems: string[] = [];

  if (questionIds.length > 0) {
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .in('question_id', questionIds);

    const answerIds = (answers ?? []).map((a) => a.id as string);
    totalQuestions = Math.max(totalQuestions, answerIds.length);

    if (answerIds.length > 0) {
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('detailed_analysis')
        .in('answer_id', answerIds);

      for (const ev of evaluations ?? []) {
        const detail = ev.detailed_analysis as DetailedAnalysis | null;
        if (!detail) continue;
        strengths.push(...(detail.strengths ?? []));
        weaknesses.push(...(detail.improvements ?? []));
        if (detail.improvements?.[0]) {
          actionItems.push(detail.improvements[0]);
        }
      }
    }
  }

  followUpQuestions = Math.max(0, totalQuestions - (interview.question_count as number));

  const startedAt = interview.started_at ? new Date(interview.started_at as string) : null;
  const completedAt = interview.completed_at
    ? new Date(interview.completed_at as string)
    : new Date();
  const durationMinutes =
    startedAt != null
      ? Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 60000))
      : 15;

  const sessionCtx = (interview.session_context ?? {}) as Record<string, unknown>;
  const jd = typeof sessionCtx.jobDescription === 'string' ? sessionCtx.jobDescription : '';
  const companyMatch = jd.match(/(?:at|@)\s+([A-Z][A-Za-z0-9&.\s-]{1,40})/);
  const company = companyMatch?.[1]?.trim();

  const { data: progress } = await supabase
    .from('user_progress')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle();

  const scores = radarToEmailScores(radarData);
  const overallScore = scaleScore(overallScore10);
  const candidateName =
    (typeof user?.name === 'string' && user.name.trim()) || 'there';

  const reportUrl = `${baseUrl}/report/${reportId}`;
  const practiceUrl = `${baseUrl}/interview/new`;

  const difficultyMap: Record<string, 'Beginner' | 'Intermediate' | 'Advanced'> = {
    easy: 'Beginner',
    medium: 'Intermediate',
    hard: 'Advanced',
  };

  return {
    candidateName,
    overallScore,
    scores,
    strengths: uniqueStrings(strengths, 5),
    weaknesses: uniqueStrings(weaknesses, 5),
    actionItems: uniqueStrings(actionItems, 3),
    stats: {
      durationMinutes,
      totalQuestions: totalQuestions || (interview.question_count as number) || 0,
      followUpQuestions,
      company,
      role: (interview.role as string) || 'Software Engineer',
    },
    roadmap: [
      { title: 'Communication', status: scores.communication >= 70 ? 'completed' : 'current' },
      { title: 'Technical Depth', status: scores.technical >= 70 ? 'completed' : 'current' },
      { title: 'System Design', status: 'pending' },
    ],
    shareUrl: reportUrl,
    reportUrl,
    streak: (progress?.current_streak as number) ?? undefined,
    nextInterview: {
      role: (interview.role as string) || 'Software Engineer',
      difficulty: difficultyMap[(interview.difficulty as string) ?? 'medium'] ?? 'Intermediate',
      duration: 15,
      url: practiceUrl,
    },
  };
}
