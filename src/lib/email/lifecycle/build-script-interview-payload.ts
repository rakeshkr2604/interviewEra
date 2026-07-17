/**
 * Build Resend props for a v2.1 script interview completion email.
 * Reuses InterviewCompletedEmail with score-v1.2 dimension labels.
 * Links always use getEmailAppUrl() (production only).
 */

import { createServiceClient } from '@/lib/supabase/server';
import { getEmailAppUrl } from '@/lib/server/get-base-url';
import type { InterviewCompletedEmailProps } from '@/emails/InterviewCompletedEmail';
import type { DimensionKey } from '@/lib/interview/answer-score/rubric';
import { DIMENSION_KEYS } from '@/lib/interview/answer-score/rubric';
import { dimensionLabel } from '@/lib/interview/script-report/aggregate';
import type { ScriptReportSynthesis } from '@/lib/interview/script-report/synthesis';

function scaleScore(score10: number): number {
  return Math.round(Math.max(0, Math.min(10, score10)) * 10);
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

function asSynthesis(raw: unknown): ScriptReportSynthesis | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as ScriptReportSynthesis;
  if (typeof s.recruiter_assessment !== 'string') return null;
  return s;
}

export async function buildScriptInterviewCompletedEmailPayload(args: {
  interviewId: string;
  userId: string;
  overallScore10: number;
  dimensionAverages: Record<DimensionKey, number>;
  scoredAnswerCount: number;
  synthesis: unknown;
}): Promise<InterviewCompletedEmailProps | null> {
  const { interviewId, userId, overallScore10, dimensionAverages, scoredAnswerCount, synthesis } =
    args;
  const supabase = createServiceClient();
  const baseUrl = getEmailAppUrl();

  const [{ data: user }, { data: interview }] = await Promise.all([
    supabase.from('users').select('name, email').eq('id', userId).maybeSingle(),
    supabase
      .from('interviews')
      .select('id, role, difficulty, started_at, completed_at, script_type')
      .eq('id', interviewId)
      .eq('user_id', userId)
      .eq('engine', 'v2.1')
      .maybeSingle(),
  ]);

  if (!interview) return null;

  const synth = asSynthesis(synthesis);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actionItems: string[] = [];

  if (synth?.hiring_signals) {
    for (const signal of synth.hiring_signals) {
      if (signal.polarity === 'strength') strengths.push(`${signal.label}: ${signal.detail}`);
      if (signal.polarity === 'gap' || signal.polarity === 'watch') {
        weaknesses.push(`${signal.label}: ${signal.detail}`);
      }
    }
  }

  if (synth?.roadmap_30_day?.[0]?.actions?.[0]) {
    actionItems.push(...synth.roadmap_30_day[0].actions.slice(0, 3));
  }

  // Fall back to weakest dimensions when synthesis is thin
  if (weaknesses.length === 0) {
    const ranked = [...DIMENSION_KEYS].sort(
      (a, b) => dimensionAverages[a] - dimensionAverages[b],
    );
    for (const key of ranked.slice(0, 3)) {
      weaknesses.push(`Improve ${dimensionLabel(key)} (${dimensionAverages[key].toFixed(1)}/10)`);
    }
  }
  if (strengths.length === 0) {
    const ranked = [...DIMENSION_KEYS].sort(
      (a, b) => dimensionAverages[b] - dimensionAverages[a],
    );
    for (const key of ranked.slice(0, 2)) {
      if (dimensionAverages[key] >= 6.5) {
        strengths.push(`Strong ${dimensionLabel(key)} (${dimensionAverages[key].toFixed(1)}/10)`);
      }
    }
  }
  if (actionItems.length === 0) {
    const weakest = [...DIMENSION_KEYS].sort(
      (a, b) => dimensionAverages[a] - dimensionAverages[b],
    )[0]!;
    actionItems.push(
      `Record 3 answers focusing only on ${dimensionLabel(weakest)}.`,
      'Rewrite one weak answer until the structure and specificity notes would change.',
      'Open your full report and practice the model answer examples.',
    );
  }

  const startedAt = interview.started_at ? new Date(interview.started_at as string) : null;
  const completedAt = interview.completed_at
    ? new Date(interview.completed_at as string)
    : new Date();
  const durationMinutes =
    startedAt != null
      ? Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 60000))
      : 20;

  const { data: progress } = await supabase
    .from('user_progress')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle();

  // Map score-v1.2 → existing email score slots (labels overridden below).
  const scores = {
    communication: scaleScore(dimensionAverages.communication_clarity),
    technical: scaleScore(dimensionAverages.content_accuracy),
    confidence: scaleScore(dimensionAverages.specificity),
    problemSolving: scaleScore(dimensionAverages.relevance),
    structure: scaleScore(dimensionAverages.structure),
  };

  const overallScore = scaleScore(overallScore10);
  const candidateName =
    (typeof user?.name === 'string' && user.name.trim()) || 'there';

  const reportUrl = `${baseUrl}/report/script/${interviewId}`;
  const practiceUrl = `${baseUrl}/interview/new`;

  const difficultyMap: Record<string, 'Beginner' | 'Intermediate' | 'Advanced'> = {
    easy: 'Beginner',
    medium: 'Intermediate',
    hard: 'Advanced',
  };

  const roadmap = [
    {
      title: 'Answer Structure',
      status: (scores.structure >= 70 ? 'completed' : 'current') as 'completed' | 'current' | 'pending',
    },
    {
      title: 'Specificity',
      status: (scores.confidence >= 70 ? 'completed' : 'current') as 'completed' | 'current' | 'pending',
    },
    {
      title: 'Content Accuracy',
      status: (scores.technical >= 70 ? 'completed' : 'current') as 'completed' | 'current' | 'pending',
    },
  ];

  return {
    candidateName,
    overallScore,
    scores,
    scoreLabels: {
      communication: 'Clarity',
      technical: 'Content Accuracy',
      confidence: 'Specificity',
      problemSolving: 'Relevance',
      structure: 'Answer Structure',
    },
    hidePeerPercentile: true,
    overallSummary:
      synth?.recruiter_assessment?.slice(0, 320) ||
      `Your weighted session score is ${overallScore}/100 across ${scoredAnswerCount} scored answer(s) (score-v1.2).`,
    strengths: uniqueStrings(strengths, 5),
    weaknesses: uniqueStrings(weaknesses, 5),
    actionItems: uniqueStrings(actionItems, 3),
    aiCoachNotes: synth?.communication_intelligence?.slice(0, 280) || undefined,
    stats: {
      durationMinutes,
      totalQuestions: scoredAnswerCount,
      followUpQuestions: 0,
      role: (interview.role as string) || 'Software Engineer',
    },
    roadmap,
    shareUrl: reportUrl,
    reportUrl,
    streak: (progress?.current_streak as number) ?? undefined,
    nextInterview: {
      role: (interview.role as string) || 'Software Engineer',
      difficulty: difficultyMap[(interview.difficulty as string) ?? 'medium'] ?? 'Intermediate',
      duration: 20,
      url: practiceUrl,
    },
  };
}
