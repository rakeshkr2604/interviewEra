import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';
import { processAnswer, processAnswerStream } from '@/lib/interview/interview-orchestrator';

function isLlmTtsStreamingEnabled(): boolean {
  return (
    process.env.VOICE_LLM_TTS_STREAMING === 'true' ||
    process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING === 'true'
  );
}
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
    const rateLimit = await checkRateLimit(`process-answer:${user.id}`, 10, 5, { failClosed: true });
    const blocked = buildRateLimitHttpResponse(
      rateLimit,
      'Too many requests. Please wait a moment before submitting.',
    );
    if (blocked) {
      return NextResponse.json(blocked.body, {
        status: blocked.status,
        headers: { ...blocked.headers, 'X-RateLimit-Remaining': '0' },
      });
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

    const sanitizedQuestion = question.slice(0, 4000);
    const sanitizedAnswer = answer.slice(0, 12000);

    const { owned, sessionContext } = await getOwnedInterviewContext(
      user.id,
      interview_id,
    );
    if (!owned) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const { data: interviewRow } = await createServiceClient()
      .from('interviews')
      .select('status')
      .eq('id', interview_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!interviewRow || interviewRow.status !== 'in_progress') {
      return NextResponse.json({ error: 'Interview is not in progress' }, { status: 400 });
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

    const acceptHeader = request.headers.get('accept') ?? '';
    const wantsSse = acceptHeader.includes('text/event-stream') && isLlmTtsStreamingEnabled();

    if (wantsSse) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const response = await processAnswerStream(
              interview_id,
              sanitizedQuestion,
              sanitizedAnswer,
              context,
              validInterviewerId,
              lockedMode,
              (sentence, index) => {
                const data = JSON.stringify({ index, text: sentence });
                controller.enqueue(encoder.encode(`event: sentence\ndata: ${data}\n\n`));
              },
              request.signal,
            );
            const completeData = JSON.stringify(response);
            controller.enqueue(encoder.encode(`event: complete\ndata: ${completeData}\n\n`));
            controller.close();
          } catch (err) {
            if (!request.signal.aborted) {
              const errData = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
              controller.enqueue(encoder.encode(`event: error\ndata: ${errData}\n\n`));
            }
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const response = await processAnswer(
      interview_id,
      sanitizedQuestion,
      sanitizedAnswer,
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
export const maxDuration = 55;
