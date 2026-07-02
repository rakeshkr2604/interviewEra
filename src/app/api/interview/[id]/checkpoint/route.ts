import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { InterviewSessionContext } from '@/types/app.types';
import {
  buildResumeSnapshot,
} from '@/lib/session/interview-resume-snapshot';

const CheckpointSchema = z.object({
  questionIndex: z.number().int().min(0),
  phase: z.enum(['avatar_speaking', 'candidate_answering', 'submitting', 'feedback']),
  transcript: z.string().max(20_000),
  timerRemaining: z.number().min(0).max(600),
  timerBudget: z.number().min(1).max(600),
  skipCount: z.number().int().min(0).max(10),
  pendingFollowUp: z
    .object({
      text: z.string().max(4000),
      tone: z.string().max(64),
    })
    .nullable(),
  inputMode: z.enum(['voice', 'text', 'deepgram']),
  followUpForIndex: z.number().int().min(-1),
  lastFeedback: z.string().max(8000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: interviewId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = CheckpointSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid checkpoint payload' },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();
    const { data: interview, error: fetchError } = await serviceClient
      .from('interviews')
      .select('id, user_id, status, session_context')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (interview.status === 'completed' || interview.status === 'abandoned') {
      return NextResponse.json({ error: 'Interview is not active' }, { status: 409 });
    }

    const ctx = (interview.session_context ?? {}) as InterviewSessionContext;
    const snapshot = buildResumeSnapshot(parsed.data);

    const { error: updateError } = await serviceClient
      .from('interviews')
      .update({
        status: interview.status === 'pending' ? 'in_progress' : interview.status,
        session_context: {
          ...ctx,
          resume: snapshot,
        },
      })
      .eq('id', interviewId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[interview/checkpoint] update failed', updateError);
      return NextResponse.json({ error: 'Failed to save checkpoint' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updatedAt: snapshot.updatedAt });
  } catch (error) {
    console.error('[interview/checkpoint]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
