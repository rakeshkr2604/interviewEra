import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkAndDeductCredit, refundCredit } from '@/lib/utils/credits';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { interviewStartSchema } from '@/lib/validations/schemas';
import { computeJdFingerprint } from '@/lib/redis/question-cache';
import type { InterviewSessionContext, InterviewGenerationContext } from '@/types/app.types';
import { getInterviewerById } from '@/lib/config/interviewers';
import { difficultyQuestionCount } from '@/lib/interview/difficulty-question-count';
import { getUserProgress } from '@/lib/retention';
import { trackProductEvent } from '@/lib/analytics/product-events';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`start:${user.id}`, 60, 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many interview starts. Please wait before trying again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = interviewStartSchema.safeParse(rawBody);
    if (!validation.success) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[interview/start] validation_failed', validation.error.flatten());
      }
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 },
      );
    }

    const {
      resumeId,
      role,
      difficulty,
      interviewerId,
      goal,
      interviewMode,
      experienceYears,
      questionCount: clientQuestionCount,
      domainPackId,
      jobDescription: rawJobDescription,
    } = validation.data;

    const jobDescription =
      rawJobDescription && rawJobDescription.trim().length > 0
        ? rawJobDescription.trim().slice(0, 12000)
        : undefined;

    let rawCount: number;
    if (domainPackId) {
      rawCount = clientQuestionCount ?? 6;
    } else {
      rawCount = clientQuestionCount ?? difficultyQuestionCount(difficulty);
    }
    const questionCount = Math.min(10, Math.max(4, rawCount));

    const userTier = (await getUserProgress(user.id))?.current_tier ?? 1;
    const jdFingerprint = computeJdFingerprint(jobDescription);

    const interviewer = getInterviewerById(interviewerId);
    if (!interviewer) {
      return NextResponse.json({ error: 'Invalid interviewer selection' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    if (domainPackId) {
      const { data: profile } = await serviceClient
        .from('users')
        .select('plan_tier')
        .eq('id', user.id)
        .single();

      const tier = profile?.plan_tier ?? 'free';
      if (tier !== 'pro' && tier !== 'campus') {
        return NextResponse.json(
          { error: 'Domain packs are a Pro feature. Please upgrade your plan.' },
          { status: 403 },
        );
      }
    }

    const { data: resume } = await serviceClient
      .from('resumes')
      .select('id, user_id, parsed_data, status')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!resume || resume.status !== 'parsed') {
      return NextResponse.json(
        { error: 'Resume is not ready yet. Please wait for parsing to complete.' },
        { status: 409 },
      );
    }

    type QuestionPayload = {
      order_index: number;
      question_text: string;
      rubric: unknown;
      category: string;
    };

    let resolvedQuestions: QuestionPayload[] | null = null;
    let useAsyncPrepare = !domainPackId;

    if (domainPackId) {
      const { data: packQuestions, error: packError } = await serviceClient
        .from('domain_pack_questions')
        .select('id, question_text, rubric, category, difficulty')
        .eq('pack_id', domainPackId)
        .order('id');

      if (packError || !packQuestions || packQuestions.length === 0) {
        return NextResponse.json({ error: 'Domain pack not found or empty.' }, { status: 404 });
      }

      const shuffled = packQuestions
        .map((q) => ({ q, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ q }) => q);

      resolvedQuestions = shuffled.slice(0, questionCount).map((q, idx) => ({
        order_index: idx,
        question_text: q.question_text as string,
        rubric: q.rubric,
        category: q.category as string,
      }));
      useAsyncPrepare = false;
    }

    const creditResult = await checkAndDeductCredit(user.id);
    if (!creditResult.success) {
      return NextResponse.json(
        { error: 'no_credits', upgradeUrl: '/upgrade' },
        { status: 402 },
      );
    }

    const generation: InterviewGenerationContext | undefined = useAsyncPrepare
      ? {
          status: 'pending',
          resumeId,
          role,
          difficulty,
          questionCount,
          goal,
          interviewMode,
          experienceYears,
          userTier,
          jdFingerprint,
        }
      : undefined;

    const sessionContext: InterviewSessionContext = {
      goal,
      interviewMode,
      experienceYears,
      interviewerId,
      ...(jobDescription ? { jobDescription } : {}),
      ...(generation ? { generation } : {}),
    };

    const { data: interview, error: interviewError } = await serviceClient
      .from('interviews')
      .insert({
        user_id: user.id,
        resume_id: resumeId,
        role,
        difficulty,
        interviewer_id: interviewer.id,
        status: useAsyncPrepare ? 'pending' : 'in_progress',
        started_at: useAsyncPrepare ? null : new Date().toISOString(),
        question_count: questionCount,
        session_context: sessionContext,
      })
      .select('id')
      .single();

    if (interviewError || !interview) {
      await refundCredit(user.id);
      console.error('[interview/start] DB insert error:', interviewError);
      return NextResponse.json({ error: 'Failed to create interview record' }, { status: 500 });
    }

    if (useAsyncPrepare) {
      trackProductEvent({
        event: 'interview_generation_started',
        userId: user.id,
        interviewId: interview.id,
        async: true,
      });
      return NextResponse.json({
        interviewId: interview.id,
        preparing: true,
        phase: 'generating_questions',
        creditsRemaining: creditResult.remaining,
      });
    }

    if (!resolvedQuestions?.length) {
      await refundCredit(user.id);
      await serviceClient.from('interviews').delete().eq('id', interview.id);
      return NextResponse.json({ error: 'No questions available for this interview.' }, { status: 500 });
    }

    const { data: insertedQuestions, error: questionsError } = await serviceClient
      .from('questions')
      .insert(
        resolvedQuestions.map((q) => ({
          interview_id: interview.id,
          ...q,
        })),
      )
      .select('id, interview_id, order_index, question_text, rubric, category');

    if (questionsError || !insertedQuestions) {
      await refundCredit(user.id);
      await serviceClient.from('interviews').delete().eq('id', interview.id);
      console.error('[interview/start] Questions insert error:', questionsError);
      return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
    }

    return NextResponse.json({
      interviewId: interview.id,
      preparing: false,
      phase: 'interview_ready',
      questions: insertedQuestions,
      creditsRemaining: creditResult.remaining,
    });
  } catch (err) {
    console.error('[interview/start] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
