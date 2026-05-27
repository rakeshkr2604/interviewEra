/**
 * Shared question resolution for sync start + async prepare routes.
 */

import { generateQuestions, QuestionGenerationError } from '@/lib/openai/generate-questions';
import { buildFallbackQuestions } from '@/lib/interview/fallback-questions';
import {
  buildCacheKey,
  getCachedQuestions,
  setCachedQuestions,
} from '@/lib/redis/question-cache';
import { trackProductEvent } from '@/lib/analytics/product-events';
import type { ParsedResume, QuestionCategory, InterviewSessionContext } from '@/types/app.types';
import type { InterviewDifficulty } from '@/types/app.types';
import type { InterviewGoal } from '@/types/onboarding.types';

export type ResolvedQuestionRow = {
  order_index: number;
  question_text: string;
  rubric: unknown;
  category: string;
};

export type ResolveQuestionsInput = {
  userId: string;
  planTier: string;
  parsedResume: ParsedResume;
  role: string;
  difficulty: InterviewDifficulty;
  questionCount: number;
  goal: InterviewGoal;
  interviewMode: InterviewSessionContext['interviewMode'];
  experienceYears: number;
  interviewerId: InterviewSessionContext['interviewerId'];
  jobDescription?: string;
  userTier: 1 | 2 | 3 | 4;
  cacheSession: Parameters<typeof buildCacheKey>[3];
  interviewId?: string;
};

export type ResolveQuestionsResult = {
  questions: ResolvedQuestionRow[];
  usedFallback: boolean;
  fromCache: boolean;
};

export async function resolveInterviewQuestions(
  input: ResolveQuestionsInput,
): Promise<ResolveQuestionsResult> {
  const cacheKey = buildCacheKey(input.role, input.difficulty, input.parsedResume, input.cacheSession);
  const cached = await getCachedQuestions(cacheKey);

  if (cached) {
    const shuffled = cached
      .map((q) => ({ q, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ q }) => q);

    return {
      fromCache: true,
      usedFallback: false,
      questions: shuffled.slice(0, input.questionCount).map((q, idx) => ({
        order_index: idx,
        question_text: q.question_text,
        rubric: q.rubric,
        category: q.category as QuestionCategory,
      })),
    };
  }

  trackProductEvent({
    event: 'interview_generation_started',
    userId: input.userId,
    interviewId: input.interviewId,
    role: input.role,
  });

  const genStart = Date.now();
  try {
    const generated = await generateQuestions({
      parsedResume: input.parsedResume,
      role: input.role,
      difficulty: input.difficulty,
      questionCount: input.questionCount,
      goal: input.goal,
      interviewMode: input.interviewMode,
      experienceYears: input.experienceYears,
      interviewerId: input.interviewerId,
      jobDescription: input.jobDescription,
      userId: input.userId,
      userTier: input.userTier,
    });

    void setCachedQuestions(
      cacheKey,
      generated.questions.map((q) => ({
        order: q.order,
        question_text: q.question_text,
        category: q.category,
        rubric: q.rubric,
      })),
    );

    trackProductEvent({
      event: 'interview_generation_completed',
      userId: input.userId,
      interviewId: input.interviewId,
      count: generated.questions.length,
      aiMs: Date.now() - genStart,
    });

    return {
      fromCache: false,
      usedFallback: false,
      questions: generated.questions.map((q) => ({
        order_index: q.order,
        question_text: q.question_text,
        rubric: q.rubric,
        category: q.category as QuestionCategory,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aiMs = Date.now() - genStart;
    console.error('[resolve-interview-questions] AI failed, using fallback', {
      message,
      interviewId: input.interviewId,
      aiMs,
      isTimeout: /deadline|timeout|Abort/i.test(message),
    });

    if (err instanceof QuestionGenerationError) {
      /* still use fallback */
    }

    const fallback = buildFallbackQuestions(input.role, input.difficulty, input.questionCount);
    trackProductEvent({
      event: 'interview_generation_fallback',
      userId: input.userId,
      interviewId: input.interviewId,
      reason: message.slice(0, 120),
      count: fallback.length,
    });

    return {
      fromCache: false,
      usedFallback: true,
      questions: fallback.map((q) => ({
        order_index: q.order,
        question_text: q.question_text,
        rubric: q.rubric,
        category: q.category,
      })),
    };
  }
}
