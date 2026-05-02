import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InterviewSession } from './InterviewSession';
import type { Question } from '@/types/app.types';

interface InterviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (interviewError || !interview) {
    console.error('[interview/page] Interview not found:', { id, userId: user.id, interviewError });
    notFound();
  }

  // If already completed, redirect to the existing report
  if (interview.status === 'completed') {
    const { data: report } = await supabase
      .from('reports')
      .select('id')
      .eq('interview_id', id)
      .maybeSingle();

    if (report) {
      redirect(`/report/${report.id}`);
    }
    // Report not yet created (race condition) — fall through to session
  }

  // Fetch questions ordered by position
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, interview_id, order_index, question_text, rubric, category')
    .eq('interview_id', id)
    .order('order_index', { ascending: true });

  if (questionsError || !questions || questions.length === 0) {
    console.error('[interview/page] Questions not found:', { interviewId: id, questionsError, count: questions?.length });
    notFound();
  }

  // Count answers already submitted (for resume support)
  const { count: answeredCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .in(
      'question_id',
      questions.map((q) => q.id)
    );

  return (
    <InterviewSession
      interviewId={id}
      questions={questions as Question[]}
      answeredCount={answeredCount ?? 0}
    />
  );
}
