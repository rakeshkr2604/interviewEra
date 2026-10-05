import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createInterviewWithCredit } from '@/lib/utils/credits';
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';
import type { ScriptType } from '@/lib/ai/scripts/script-loader';
import { createResumeInterviewSnapshot } from '@/lib/resume/interview-snapshot';
import { setQuestionPlanStatus } from '@/lib/interview/question-plan/persist';
import { trackInterviewEvent } from '@/lib/analytics/interview-events';
import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store';
import {
  activeInterviewAgeMs,
  activeInterviewConflictBody,
  asActiveInterviewConflict,
} from '@/lib/interview/active-interview-policy';

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

    // Step 5 — duplicate prevention. A retry reuses the just-created script
    // interview and never reaches the transactional debit helper.
    // Stale vs genuine-active is decided inside create_interview_with_credit;
    // do not 409 here on every pending/in_progress row.
    const recentCutoff = new Date(Date.now() - 90_000).toISOString();
    const { data: recentInterview, error: recentError } = await serviceClient
      .from('interviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('resume_id', resumeId)
      .eq('role', role)
      .eq('engine', 'v2.1')
      .eq('status', 'in_progress')
      .gte('created_at', recentCutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentError) {
      console.error('[interview/script/start] recent-interview lookup failed', {
        userId: user.id,
        code: recentError.code,
        message: recentError.message,
      });
    } else if (recentInterview?.id) {
      console.info('[interview/script/start]', {
        event: 'deduped_recent',
        userId: user.id,
        existingActiveInterviewId: recentInterview.id,
      });
      return NextResponse.json({
        interviewId: recentInterview.id,
        scriptType,
        resumeSnapshotId: null,
        deduped: true,
      });
    }

    // Step 6 — returning user: any prior completed interview
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

    // Step 7 — atomically create the v2.1 interview and its linked credit debit.
    const creditResult = await createInterviewWithCredit({
      userId: user.id,
      resumeId,
      role,
      difficulty,
      questionCount,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      interviewerId,
      sessionContext: {
        goal,
        interviewMode,
        experienceYears,
        interviewerId,
        cameraMode,
        ...(jobDescription ? { jobDescription } : {}),
      },
      engine: 'v2.1',
      scriptType,
      selfIntroEnabled,
      followUpEnabled,
      isReturningUser,
      maxSkips,
      skipsUsed: 0,
      currentTurnIndex: 0,
    });
    if (!creditResult.success || !creditResult.interviewId) {
      console.info('[interview/script/start]', {
        event: 'no_credits',
        userId: user.id,
      });
      return NextResponse.json({ error: 'no_credits', upgradeUrl: '/upgrade' }, { status: 402 });
    }
    const interviewId = creditResult.interviewId;

    console.info('[interview/script/start]', {
      event: creditResult.created === false ? 'reused_active' : 'created',
      userId: user.id,
      newInterviewId: interviewId,
      created: creditResult.created !== false,
      creditTransactionId: creditResult.creditTransactionId,
    });

    if (creditResult.created === false) {
      return NextResponse.json({
        interviewId,
        scriptType,
        resumeSnapshotId: null,
        deduped: true,
      });
    }

    // Step 8 — freeze resume content for this interview (immutable snapshot)
    const snapshot = await createResumeInterviewSnapshot(serviceClient, {
      interviewId,
      resumeId,
      jobDescription,
    });
    if (!snapshot) {
      console.warn('[interview/script/start] snapshot not created; turn will use live fallback', {
        interviewId,
        resumeId,
      });
    }

    // Step 8b — mark this interview for a persisted core plan.
    // Generation runs on the first turn so startup stays inside the 30s route budget.
    // Interviews created before this marker stay on the legacy turn path.
    await setQuestionPlanStatus(serviceClient, interviewId, 'pending');

    // Step 9 — analytics (grep `[product-event]` / durable milestone)
    trackInterviewEvent('interview_created', {
      userId: user.id,
      interviewId,
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
      interview_id: interviewId,
      engine: 'v2.1',
      role,
      difficulty,
      interviewMode,
      scriptType,
    });

    // Step 10 — created
    return NextResponse.json(
      {
        interviewId,
        scriptType,
        resumeSnapshotId: snapshot?.id ?? null,
      },
      { status: 201 },
    );
  } catch (err) {
    const conflict = asActiveInterviewConflict(err);
    if (conflict) {
      console.info('[interview/script/start]', {
        event: 'active_interview_conflict',
        userId: userId ?? 'unknown',
        existingActiveInterviewId: conflict.interviewId,
        existingActiveInterviewStatus: conflict.status,
        existingActiveInterviewEngine: conflict.engine,
        existingActiveInterviewAgeMs: activeInterviewAgeMs(conflict.startedAt),
      });
      return NextResponse.json(activeInterviewConflictBody(conflict), { status: 409 });
    }
    console.error(`[interview/script/start] Unexpected error (userId=${userId ?? 'unknown'}):`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
