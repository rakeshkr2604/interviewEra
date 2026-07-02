/**
 * Server-side interview session loader for GET /api/interview/[id].
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { InterviewSessionContext } from '@/types/app.types';
import {
  getConversationState,
} from '@/lib/interview/conversation-state';
import {
  isValidResumeSnapshot,
  resolveResumeQuestionIndex,
  isResumeSession,
  type InterviewResumeSnapshot,
  type SubmittedAnswerPayload,
  type ConversationResumePayload,
} from '@/lib/session/interview-resume-snapshot';

export type LoadedInterviewSession = {
  interviewId: string;
  status: string;
  preparing: boolean;
  phase: 'generating_questions' | 'interview_ready';
  interviewerId: string;
  role: string;
  difficulty: string;
  answeredCount: number;
  currentQuestionIndex: number;
  isResume: boolean;
  resumeSnapshot: InterviewResumeSnapshot | null;
  submittedAnswers: SubmittedAnswerPayload[];
  conversation: ConversationResumePayload | null;
  questions: Array<{
    id: string;
    order: number;
    question_text: string;
    category: string;
    rubric: unknown;
    timeLimit: number;
  }>;
};

export async function loadInterviewSessionForClient(
  supabase: SupabaseClient,
  interviewId: string,
  userId: string,
): Promise<LoadedInterviewSession | null> {
  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', interviewId)
    .eq('user_id', userId)
    .single();

  if (interviewError || !interview) return null;

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('interview_id', interviewId)
    .order('order_index', { ascending: true });

  if (questionsError) return null;

  if (!interview.interviewer_id) return null;

  const questionRows = questions ?? [];
  const questionIds = questionRows.map((q) => String(q.id));

  let answeredCount = 0;
  const submittedAnswers: SubmittedAnswerPayload[] = [];

  if (questionIds.length > 0) {
    const orderByQuestionId = new Map(
      questionRows.map((q) => [String(q.id), q.order_index as number]),
    );

    const { data: answerRows } = await supabase
      .from('answers')
      .select('id, question_id, answer_text, submitted_at, duration_seconds')
      .in('question_id', questionIds);

    if (answerRows?.length) {
      answeredCount = answerRows.length;

      const answerIds = answerRows.map((a) => a.id as string);
      const { data: evalRows } = await supabase
        .from('evaluations')
        .select('answer_id, feedback_text')
        .in('answer_id', answerIds);

      const feedbackByAnswer = new Map(
        (evalRows ?? []).map((e) => [e.answer_id as string, e.feedback_text as string]),
      );

      for (const row of answerRows) {
        submittedAnswers.push({
          questionId: String(row.question_id),
          orderIndex: orderByQuestionId.get(String(row.question_id)) ?? 0,
          transcript: String(row.answer_text ?? ''),
          durationSeconds: Number(row.duration_seconds ?? 0),
          submittedAt: String(row.submitted_at ?? ''),
          feedback: feedbackByAnswer.get(row.id as string),
        });
      }

      submittedAnswers.sort((a, b) => a.orderIndex - b.orderIndex);
    }
  }

  const ctx = (interview.session_context ?? {}) as InterviewSessionContext & {
    resume?: unknown;
  };
  const resumeSnapshot = isValidResumeSnapshot(ctx.resume) ? ctx.resume : null;

  const conversationState = await getConversationState(interviewId);
  const conversation: ConversationResumePayload | null = conversationState
    ? {
        currentQuestionIndex: conversationState.current_question_index,
        needsFollowup: conversationState.needs_followup,
        followupContext: conversationState.followup_context ?? null,
        dialogueHistory: conversationState.dialogue_history ?? [],
      }
    : null;

  const preparing = interview.status === 'pending' && questionRows.length === 0;
  const currentQuestionIndex = resolveResumeQuestionIndex({
    questionCount: questionRows.length,
    answeredCount,
    status: interview.status,
    snapshot: resumeSnapshot,
  });

  return {
    interviewId: interview.id,
    status: interview.status,
    preparing,
    phase: preparing ? 'generating_questions' : 'interview_ready',
    interviewerId: interview.interviewer_id,
    role: interview.role,
    difficulty: interview.difficulty,
    answeredCount,
    currentQuestionIndex,
    isResume: isResumeSession({
      status: interview.status,
      answeredCount,
      snapshot: resumeSnapshot,
    }),
    resumeSnapshot,
    submittedAnswers,
    conversation,
    questions: questionRows.map((q) => ({
      id: String(q.id),
      order: q.order_index as number,
      question_text: String(q.question_text),
      category: String(q.category ?? 'general'),
      rubric: q.rubric,
      timeLimit: 60,
    })),
  };
}
