import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { processAnswer } from '@/lib/interview/interview-orchestrator';
import type { InterviewContext } from '@/lib/interview/types';
import { getInterviewerById, type InterviewerId } from '@/lib/config/interviewers';
import { normalizeInterviewMode } from '@/lib/interview/interview-mode';
import type { InterviewSessionContext } from '@/types/app.types';

/**
 * Returns the owned interview's session_context (or null). One query doubles as
 * the ownership check AND the server-authoritative source of the locked mode —
 * the client cannot spoof which mode follow-ups must stay within.
 */
async function getOwnedInterviewContext(
  userId: string,
  interviewId: string,
): Promise<{ owned: boolean; sessionContext: InterviewSessionContext | null }> {
  const service = createServiceClient();
  const { data } = await service
    .from('interviews')
    .select('id, session_context')
    .eq('id', interviewId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return { owned: false, sessionContext: null };
  return {
    owned: true,
    sessionContext: (data.session_context as InterviewSessionContext | null) ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1-2 LLM calls per request — rate limit like the sibling answer route.
    const rateLimit = await checkRateLimit(`process-answer:${user.id}`, 10, 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before submitting.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { interview_id, question, answer, context, interviewer_id } = (body ?? {}) as {
      interview_id?: string;
      question?: string;
      answer?: string;
      context?: InterviewContext;
      interviewer_id?: string;
    };

    if (!interview_id || !question || !answer || !context) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { owned, sessionContext } = await getOwnedInterviewContext(
      user.id,
      interview_id,
    );
    if (!owned) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Server-authoritative locked mode (falls back to context.interview_style
    // only if session_context is somehow absent on legacy rows).
    const lockedMode = normalizeInterviewMode(
      sessionContext?.interviewMode ?? context.interview_style,
    );

    // Validate the client-supplied interviewer id against the known set before
    // it reaches the persona prompt (boundary check — never trust client input).
    const validInterviewerId: InterviewerId | null = getInterviewerById(interviewer_id)
      ? (interviewer_id as InterviewerId)
      : null;

    const response = await processAnswer(
      interview_id,
      question,
      answer,
      context,
      validInterviewerId,
      lockedMode,
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('[process-answer-api]', error);
    return NextResponse.json({ error: 'Failed to process answer' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30; // Allow up to 30s for LLM calls
