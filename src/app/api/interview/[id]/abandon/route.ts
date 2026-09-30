import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { trackInterviewEvent } from '@/lib/analytics/interview-events';
import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store';

/**
 * Mark an in-progress interview as abandoned (user left without completing).
 * Idempotent — already-abandoned/completed interviews return success without mutation.
 * Fresh abandons emit durable `interview_abandoned` (migration 052 dedupe).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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

    const rateLimit = await checkRateLimit(`abandon:${user.id}`, 60, 10);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const serviceClient = createServiceClient();
    const { data: interview } = await serviceClient
      .from('interviews')
      .select('id, status')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (interview.status === 'completed' || interview.status === 'abandoned') {
      return NextResponse.json({ ok: true, status: interview.status, idempotent: true });
    }

    if (interview.status !== 'in_progress' && interview.status !== 'pending') {
      return NextResponse.json({ error: 'Interview cannot be abandoned.' }, { status: 400 });
    }

    const previousStatus = interview.status;

    const { data: abandonedRows, error: updateError } = await serviceClient
      .from('interviews')
      .update({ status: 'abandoned', completed_at: new Date().toISOString() })
      .eq('id', interviewId)
      .in('status', ['pending', 'in_progress'])
      .select('id');

    if (updateError) {
      console.error('[interview/abandon] update failed', {
        interviewId,
        error: updateError.message,
      });
      return NextResponse.json({ error: 'Failed to abandon interview' }, { status: 500 });
    }

    if (!Array.isArray(abandonedRows) || abandonedRows.length === 0) {
      // Concurrent completer/abandoner won — re-read for idempotent response.
      const { data: current } = await serviceClient
        .from('interviews')
        .select('status')
        .eq('id', interviewId)
        .maybeSingle();
      const status = (current?.status as string | undefined) ?? previousStatus;
      return NextResponse.json({ ok: true, status, idempotent: true });
    }

    trackInterviewEvent('interview_abandoned', {
      userId: user.id,
      interviewId,
      previousStatus,
    });

    try {
      persistMilestoneEventOnce('interview_abandoned', {
        user_id: user.id,
        interview_id: interviewId,
        previous_status: previousStatus,
      });
    } catch (err) {
      console.warn('[interview/abandon] interview_abandoned milestone threw (ignored)', {
        interviewId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({ ok: true, status: 'abandoned' });
  } catch (err) {
    console.error('[interview/abandon]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
