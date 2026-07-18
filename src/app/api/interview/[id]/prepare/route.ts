import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkLLMCostGuard, estimateLLMCallCostUSD, recordLLMSpend } from '@/lib/ai/llm-cost-guard';
import { resolveInterviewQuestions } from '@/lib/interview/resolve-interview-questions';
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';
import { trackInterviewEvent } from '@/lib/analytics/interview-events';
import {
  logPrepareCompleted,
  logPrepareFailed,
  logPrepareStarted,
} from '@/lib/telemetry/prepare-server-span';
import type {
  InterviewSessionContext,
  InterviewGenerationContext,
} from '@/types/app.types';
import { loadResumeContextForInterview } from '@/lib/resume/interview-snapshot';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: interviewId } = await params;
  let prepareStartedAt: number | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`prepare:${user.id}`, 60, 15, { failClosed: true });
    const blocked = buildRateLimitHttpResponse(rateLimit, 'Too many prepare requests.');
    if (blocked) {
      return NextResponse.json(blocked.body, {
        status: blocked.status,
        headers: blocked.headers,
      });
    }

    const serviceClient = createServiceClient();

    const { data: interview, error: intErr } = await serviceClient
      .from('interviews')
      .select('id, user_id, status, started_at, session_context, resume_id, role, difficulty')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (intErr || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const { count: existingCount } = await serviceClient
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('interview_id', interviewId);

    if ((existingCount ?? 0) > 0) {
      const now = new Date().toISOString();
      const patch: { status?: string; started_at?: string } = {};
      if (interview.status === 'pending') patch.status = 'in_progress';
      if (!interview.started_at) patch.started_at = now;
      if (Object.keys(patch).length > 0) {
        await serviceClient.from('interviews').update(patch).eq('id', interviewId);
      }
      logPrepareCompleted(interviewId, logPrepareStarted(interviewId), existingCount ?? 0);
      return NextResponse.json({
        ready: true,
        status: 'in_progress',
        questionCount: existingCount,
      });
    }

    const ctx = (interview.session_context ?? {}) as InterviewSessionContext;
    const gen = ctx.generation;
    if (!gen || gen.status === 'ready') {
      return NextResponse.json({ error: 'Interview is not awaiting question generation.' }, { status: 409 });
    }

    const resumeCtx = await loadResumeContextForInterview(serviceClient, {
      interviewId,
      resumeId: gen.resumeId,
    });
    if (!resumeCtx.parsed) {
      return NextResponse.json({ error: 'Resume not ready.' }, { status: 409 });
    }

    const { data: userProfile } = await serviceClient
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .single();
    const planTier = (userProfile?.plan_tier as string | undefined) ?? 'free';

    const qGenCost = estimateLLMCallCostUSD('question_generation');
    const qGenCostGuard = await checkLLMCostGuard(user.id, planTier, qGenCost, 'question_generation');
    if (!qGenCostGuard.allowed) {
      return NextResponse.json(
        { error: 'Monthly AI usage limit reached. Please upgrade your plan or try again next month.' },
        { status: 429 },
      );
    }

    const parsedResume = resumeCtx.parsed;
    prepareStartedAt = logPrepareStarted(interviewId);
    const resolved = await resolveInterviewQuestions({
      userId: user.id,
      planTier,
      parsedResume,
      role: gen.role,
      difficulty: gen.difficulty,
      questionCount: gen.questionCount,
      goal: gen.goal,
      interviewMode: gen.interviewMode,
      experienceYears: gen.experienceYears,
      interviewerId: ctx.interviewerId,
      jobDescription: ctx.jobDescription,
      userTier: gen.userTier as 1 | 2 | 3 | 4,
      cacheSession: {
        goal: gen.goal,
        interviewMode: gen.interviewMode,
        experienceYears: gen.experienceYears,
        interviewerId: ctx.interviewerId,
        jdFingerprint: gen.jdFingerprint,
        tier: gen.userTier,
      },
      interviewId,
    });

    if (!resolved.usedFallback) {
      void recordLLMSpend(user.id, qGenCost);
    }

    const { error: qErr } = await serviceClient.from('questions').insert(
      resolved.questions.map((q) => ({
        interview_id: interviewId,
        ...q,
      })),
    );

    if (qErr) {
      console.error('[interview/prepare] insert failed', qErr);
      logPrepareFailed(interviewId, prepareStartedAt, 'Failed to save questions.', 500);
      return NextResponse.json({ error: 'Failed to save questions.' }, { status: 500 });
    }

    const nextGen: InterviewGenerationContext = {
      ...gen,
      status: 'ready',
      usedFallback: resolved.usedFallback,
      fromCache: resolved.fromCache,
    };

    const now = new Date().toISOString();
    await serviceClient
      .from('interviews')
      .update({
        status: 'in_progress',
        started_at: interview.started_at ?? now,
        session_context: { ...ctx, generation: nextGen },
      })
      .eq('id', interviewId);

    logPrepareCompleted(interviewId, prepareStartedAt, resolved.questions.length);

    trackInterviewEvent('question_generated', {
      userId: user.id,
      interviewId,
      count: resolved.questions.length,
      usedFallback: resolved.usedFallback,
      fromCache: resolved.fromCache,
    });

    return NextResponse.json({
      ready: true,
      status: 'in_progress',
      questionCount: resolved.questions.length,
      usedFallback: resolved.usedFallback,
    });
  } catch (err) {
    console.error('[interview/prepare] unexpected', err);
    logPrepareFailed(
      interviewId,
      prepareStartedAt,
      err instanceof Error ? err.message : 'Internal server error',
      500,
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
