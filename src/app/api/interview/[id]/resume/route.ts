import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { trackInterviewEvent } from '@/lib/analytics/interview-events';
import {
  activeInterviewConflictBody,
  ActiveInterviewExistsError,
  activeInterviewResumePath,
} from '@/lib/interview/active-interview-policy';

/**
 * Reopen an abandoned interview that already consumed a credit.
 * Same row / questions. No extra debit. One resume per interview.
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

    const rateLimit = await checkRateLimit(`resume:${user.id}`, 60, 10);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient.rpc('resume_abandoned_interview', {
      p_user_id: user.id,
      p_interview_id: interviewId,
    });

    if (error) {
      console.error('[interview/resume] RPC failed', {
        userId: user.id,
        interviewId,
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ error: 'Failed to resume interview' }, { status: 500 });
    }

    const row = (
      data as Array<{
        ok: boolean;
        interview_id: string | null;
        engine: string | null;
        reason: string | null;
      }> | null
    )?.[0];

    if (!row) {
      return NextResponse.json({ error: 'Failed to resume interview' }, { status: 500 });
    }

    if (row.ok && row.interview_id) {
      if (row.reason === 'reopened') {
        trackInterviewEvent('interview_resumed', {
          userId: user.id,
          interviewId: row.interview_id,
          engine: row.engine ?? undefined,
          source: 'history_continue',
        });
      }
      return NextResponse.json({
        ok: true,
        interviewId: row.interview_id,
        resumeUrl: activeInterviewResumePath(row.engine, row.interview_id),
        reason: row.reason,
      });
    }

    if (row.reason === 'other_active' && row.interview_id) {
      const conflict = new ActiveInterviewExistsError(
        row.interview_id,
        'in_progress',
        row.engine ?? undefined,
        null,
      );
      return NextResponse.json(activeInterviewConflictBody(conflict), { status: 409 });
    }

    if (row.reason === 'already_resumed') {
      return NextResponse.json(
        {
          error: 'already_resumed',
          message: 'You already used the one continue on this interview.',
          interviewId: row.interview_id ?? interviewId,
        },
        { status: 409 },
      );
    }

    if (row.reason === 'not_found') {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (row.reason === 'no_credit') {
      return NextResponse.json(
        { error: 'not_eligible', message: 'This session did not use a credit and cannot be continued.' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'not_eligible',
        message: 'This interview cannot be continued.',
        reason: row.reason,
      },
      { status: 400 },
    );
  } catch (err) {
    console.error('[interview/resume]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
