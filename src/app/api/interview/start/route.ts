import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkAndDeductCredit, refundCredit } from '@/lib/utils/credits';
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';
import { interviewStartSchema } from '@/lib/validations/schemas';
import { computeJdFingerprint } from '@/lib/redis/question-cache';
import type { InterviewSessionContext, InterviewGenerationContext } from '@/types/app.types';
import { getInterviewerById } from '@/lib/config/interviewers';
import { difficultyQuestionCount } from '@/lib/interview/difficulty-question-count';
import { getExperimentFirstInterviewQuestionCount } from '@/lib/analytics/experiments';
import { getUserProgress } from '@/lib/retention';
import { trackProductEvent } from '@/lib/analytics/product-events';
import { trackInterviewEvent } from '@/lib/analytics/interview-events';
import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store';
import { createResumeInterviewSnapshot } from '@/lib/resume/interview-snapshot';

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

    const rateLimit = await checkRateLimit(`start:${user.id}`, 60, 5, { failClosed: true });
    const blocked = buildRateLimitHttpResponse(
      rateLimit,
      'Too many interview starts. Please wait before trying again.',
    );
    if (blocked) {
      return NextResponse.json(blocked.body, {
        status: blocked.status,
        headers: { ...blocked.headers, 'X-RateLimit-Remaining': '0' },
      });
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

    const serviceClient = createServiceClient();

    let rawCount: number;
    if (domainPackId) {
      rawCount = clientQuestionCount ?? 6;
    } else {
      const { count: priorCompleted } = await serviceClient
        .from('interviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const isFirstCompletedInterview = (priorCompleted ?? 0) === 0;
      if (isFirstCompletedInterview && clientQuestionCount === undefined) {
        rawCount = await getExperimentFirstInterviewQuestionCount(user.id);
      } else {
        rawCount = clientQuestionCount ?? difficultyQuestionCount(difficulty);
      }
    }
    const questionCount = Math.min(10, Math.max(4, rawCount));

    const userTier = (await getUserProgress(user.id))?.current_tier ?? 1;
    const jdFingerprint = computeJdFingerprint(jobDescription);

    const interviewer = getInterviewerById(interviewerId);
    if (!interviewer) {
      return NextResponse.json({ error: 'Invalid interviewer selection' }, { status: 400 });
    }

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

    // ── Duplicate prevention ─────────────────────────────────────────────────
    // 1) Reuse a just-created pending interview (double-click / retry) — no extra credit.
    const recentCutoff = new Date(Date.now() - 90_000).toISOString();
    const { data: recentPending } = await serviceClient
      .from('interviews')
      .select('id, status, created_at')
      .eq('user_id', user.id)
      .eq('resume_id', resumeId)
      .eq('role', role)
      .eq('status', 'pending')
      .gte('created_at', recentCutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentPending?.id) {
      trackInterviewEvent('interview_created', {
        userId: user.id,
        interviewId: recentPending.id,
        deduped: true,
      });
      return NextResponse.json({
        interviewId: recentPending.id,
        preparing: true,
        phase: 'generating_questions',
        deduped: true,
      });
    }

    // 2) Block a second concurrent session — resume the active one instead.
    const { data: activeInterview } = await serviceClient
      .from('interviews')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeInterview?.id) {
      return NextResponse.json(
        {
          error: 'active_interview',
          interviewId: activeInterview.id,
          status: activeInterview.status,
          resumeUrl: `/interview/session/${activeInterview.id}`,
        },
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

    // Freeze resume for this interview (immutable; prepare/questions must not chase live edits)
    await createResumeInterviewSnapshot(serviceClient, {
      interviewId: interview.id,
      resumeId,
      jobDescription,
    });

    trackInterviewEvent('interview_created', {
      userId: user.id,
      interviewId: interview.id,
      role,
      difficulty,
      async: useAsyncPrepare,
    });

    // Durable lifecycle event — fresh creation only (the recentPending dedupe
    // branch above reuses an existing interviewId, which would either no-op
    // against the unique index or double-report an already-started session).
    // Dedupe: partial unique index on (event_name, interview_id) — migration 052.
    persistMilestoneEventOnce('interview_started', {
      user_id: user.id,
      interview_id: interview.id,
      role,
      difficulty,
      async: useAsyncPrepare,
    });

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
