import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReplayClient } from './ReplayClient';
import type { AnswerMode, DimensionScores, PlanTier, QuestionCategory } from '@/types/app.types';
import type { ReplayItem } from './ReplayClient';

interface ReplayPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReplayPage({ params }: ReplayPageProps) {
  const { id: reportId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch report
  const { data: report } = await supabase
    .from('reports')
    .select('id, interview_id, overall_score')
    .eq('id', reportId)
    .maybeSingle();

  if (!report) notFound();

  // Verify ownership + fetch interview + user plan (parallel)
  const [{ data: interview }, { data: profile }] = await Promise.all([
    supabase
      .from('interviews')
      .select('id, user_id, role, difficulty')
      .eq('id', report.interview_id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('users').select('plan_tier').eq('id', user.id).single(),
  ]);

  if (!interview) notFound();

  // Pro gate: only Pro and Campus can view replay
  const planTier = (profile?.plan_tier ?? 'free') as PlanTier;
  if (planTier !== 'pro' && planTier !== 'campus') {
    redirect('/upgrade?reason=replay');
  }

  // Fetch questions → answers → evaluations
  const { data: questions } = await supabase
    .from('questions')
    .select('id, order_index, question_text, category')
    .eq('interview_id', interview.id)
    .order('order_index', { ascending: true });

  const questionIds = (questions ?? []).map((q) => q.id as string);

  const { data: answers } = await supabase
    .from('answers')
    .select('id, question_id, answer_text, answer_mode')
    .in('question_id', questionIds);

  const answerIds = (answers ?? []).map((a) => a.id as string);

  const { data: evaluations } =
    answerIds.length > 0
      ? await supabase
          .from('evaluations')
          .select('answer_id, overall_score, dimension_scores, feedback_text, detailed_analysis')
          .in('answer_id', answerIds)
      : { data: [] };

  // Build replay items
  const items: ReplayItem[] = (questions ?? []).map((q) => {
    const answer = (answers ?? []).find((a) => a.question_id === q.id) ?? null;
    const evaluation = answer
      ? ((evaluations ?? []).find((e) => e.answer_id === answer.id) ?? null)
      : null;

    const detailedAnalysis = evaluation?.detailed_analysis as
      | { model_answer_hint?: string }
      | null;

    return {
      questionId: q.id as string,
      orderIndex: q.order_index as number,
      questionText: q.question_text as string,
      category: q.category as QuestionCategory,
      answerText: answer ? (answer.answer_text as string) : null,
      answerMode: answer ? (answer.answer_mode as AnswerMode) : null,
      overallScore: evaluation ? (evaluation.overall_score as number) : null,
      feedbackText: evaluation ? (evaluation.feedback_text as string) : null,
      dimensionScores: evaluation
        ? (evaluation.dimension_scores as DimensionScores)
        : null,
      modelAnswerHint: detailedAnalysis?.model_answer_hint ?? null,
    };
  });

  return (
    <ReplayClient
      reportId={reportId}
      role={interview.role as string}
      difficulty={interview.difficulty as string}
      items={items}
    />
  );
}
