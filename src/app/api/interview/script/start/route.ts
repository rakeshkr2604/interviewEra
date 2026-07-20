import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkAndDeductCredit, refundCredit } from '@/lib/utils/credits';
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';
import type { ScriptType } from '@/lib/ai/scripts/script-loader';
import { createResumeInterviewSnapshot } from '@/lib/resume/interview-snapshot';
import { trackInterviewEvent } from '@/lib/analytics/interview-events';
import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store';

const scriptStartSchema = z.object({
  resumeId: z.string().uuid(),
  role: z.string().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  interviewerId: z.enum(['priya', 'arjun']),
  goal: z.enum(['fresher_placement', 'job_switch', 'promotion_prep', 'general_practice']),
  interviewMode: z.enum(['technical', 'hr_behavioral', 'mixed']),
  experienceYears: z.number().min(0).max(60).default(0),
  selfIntroEnabled: z.boolean().default(true),
  followUpEnabled: z.boolean().default(true),
  cameraMode: z.boolean().default(true),
  jobDescription: z.string().max(12000).optional(),
});

const QUESTION_COUNT_BY_DIFFICULTY: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 4,
  medium: 6,
  hard: 8,
};

const MAX_SKIPS_BY_DIFFICULTY: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 2,
  medium: 2,
  hard: 1,
};

const SCRIPT_TYPE_BY_MODE: Record<'technical' | 'hr_behavioral' | 'mixed', ScriptType> = {
  technical: 'SCRIPT_T',
  hr_behavioral: 'SCRIPT_H',
  mixed: 'SCRIPT_M',
};

export async function POST(request: Request): Promise<NextResponse> {
  let userId: string | undefined;
  try {
    // Step 1 — auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = user.id;

    // Step 2 — validate body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = scriptStartSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          fieldErrors: validation.error.flatten().fieldErrors,
        },
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
      selfIntroEnabled,
      followUpEnabled,
      cameraMode,
      jobDescription: rawJobDescription,
    } = validation.data;

    // Step 3 — Redis rate limit (same helper + fail-closed policy as v1 start route)
    const rateLimit = await checkRateLimit(`script_start:${user.id}`, 60, 5, { failClosed: true });
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

    const jobDescription =
      rawJobDescription && rawJobDescription.trim().length > 0
        ? rawJobDescription.trim().slice(0, 12000)
        : undefined;

    const questionCount = QUESTION_COUNT_BY_DIFFICULTY[difficulty];
    const maxSkips = MAX_SKIPS_BY_DIFFICULTY[difficulty];
    const scriptType = SCRIPT_TYPE_BY_MODE[interviewMode];

    const serviceClient = createServiceClient();

    // Step 4 — validate resume is usable (parsed / review_ready / verified)
    const { data: resumeRow, error: resumeErr } = await serviceClient
      .from('resumes')
      .select('id, status, lifecycle_status, deleted_at')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (resumeErr || !resumeRow || resumeRow.deleted_at) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }
    if (resumeRow.status !== 'parsed') {
      return NextResponse.json(
        { error: 'Resume is not ready. Finish parsing before starting an interview.' },
        { status: 422 },
      );
    }

    // Step 5 — returning user: any prior completed interview
    const { count: completedCount, error: countError } = await serviceClient
      .from('interviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (countError) {
      console.error(`[interview/script/start] completed-count query failed (userId=${user.id}):`, countError);
      return NextResponse.json({ error: 'Failed to start interview' }, { status: 500 });
    }
    const isReturningUser = (completedCount ?? 0) >= 1;

    // Step 6 — credit check + deduction (same pattern as v1 start route)
    const creditResult = await checkAndDeductCredit(user.id);
    if (!creditResult.success) {
      return NextResponse.json({ error: 'no_credits', upgradeUrl: '/upgrade' }, { status: 402 });
    }

    // Step 7 — insert v2.1 interview row
    const { data: interview, error: interviewError } = await serviceClient
      .from('interviews')
      .insert({
        user_id: user.id,
        resume_id: resumeId,
        role,
        difficulty,
        interviewer_id: interviewerId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        question_count: questionCount,
        session_context: {
          goal,
          interviewMode,
          experienceYears,
          interviewerId,
          cameraMode,
          ...(jobDescription ? { jobDescription } : {}),
        },
        engine: 'v2.1',
        script_type: scriptType,
        self_intro_enabled: selfIntroEnabled,
        follow_up_enabled: followUpEnabled,
        is_returning_user: isReturningUser,
        max_skips: maxSkips,
        skips_used: 0,
        current_turn_index: 0,
      })
      .select('id')
      .single();

    if (interviewError || !interview) {
      await refundCredit(user.id);
      console.error(`[interview/script/start] DB insert failed (userId=${user.id}):`, interviewError);
      return NextResponse.json({ error: 'Failed to create interview record' }, { status: 500 });
    }

    // Step 8 — freeze resume content for this interview (immutable snapshot)
    const snapshot = await createResumeInterviewSnapshot(serviceClient, {
      interviewId: interview.id,
      resumeId,
      jobDescription,
    });
    if (!snapshot) {
      console.warn('[interview/script/start] snapshot not created; turn will use live fallback', {
        interviewId: interview.id,
        resumeId,
      });
    }

    // Step 9 — analytics (grep `[product-event]` / durable milestone)
    trackInterviewEvent('interview_created', {
      userId: user.id,
      interviewId: interview.id,
      engine: 'v2.1',
      role,
      difficulty,
      interviewMode,
      scriptType,
      cameraMode,
      followUpEnabled,
    });
    persistMilestoneEventOnce('interview_started', {
      user_id: user.id,
      interview_id: interview.id,
      engine: 'v2.1',
      role,
      difficulty,
      interviewMode,
      scriptType,
    });

    // Step 10 — created
    return NextResponse.json(
      {
        interviewId: interview.id,
        scriptType,
        resumeSnapshotId: snapshot?.id ?? null,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(`[interview/script/start] Unexpected error (userId=${userId ?? 'unknown'}):`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
