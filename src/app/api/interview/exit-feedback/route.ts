import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { interviewExitFeedbackSubmitSchema } from '@/lib/validations/interview-exit-feedback';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store';

export const runtime = 'nodejs';
export const maxDuration = 30;

const getQuerySchema = z.object({
  interviewId: z.string().uuid('Invalid interview ID.'),
});

/**
 * POST /api/interview/exit-feedback
 *
 * Saves exit feedback for an incomplete interview session.
 * Enforces authenticated user ownership, validates incomplete status,
 * idempotently upserts the feedback record, and marks the interview as abandoned if active.
 */
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

    const rl = await checkRateLimit(`interview-exit-feedback:${user.id}`, 60, 10);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const parsed = interviewExitFeedbackSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid exit feedback input.' },
        { status: 400 },
      );
    }

    const {
      interviewId,
      exitReason,
      issueType,
      comment,
      questionIndex,
      progressPercent,
      engine,
      deviceInfo,
    } = parsed.data;

    const serviceClient = createServiceClient();

    // Verify interview exists and belongs to the authenticated user
    const { data: interview, error: interviewError } = await serviceClient
      .from('interviews')
      .select('id, user_id, status, role, engine')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (interviewError) {
      console.error('[interview/exit-feedback] interview lookup failed:', interviewError.message);
      return NextResponse.json(
        { error: 'Could not verify interview ownership.' },
        { status: 502 },
      );
    }

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found or unauthorized.' },
        { status: 404 },
      );
    }

    // Exit feedback is strictly for incomplete interviews.
    if (interview.status === 'completed') {
      return NextResponse.json(
        { error: 'Interview has already been completed.' },
        { status: 400 },
      );
    }

    // Mark interview as abandoned if still active. Status filter is on the UPDATE;
    // emit durable interview_abandoned only when a row actually transitioned.
    // Do not also trackProductEventServer('interview_abandoned') — that duplicated
    // the lifecycle milestone. Keep interview_exit_feedback_submitted below.
    if (interview.status === 'in_progress' || interview.status === 'pending') {
      const previousStatus = interview.status;
      const { data: abandonedRows, error: abandonError } = await serviceClient
        .from('interviews')
        .update({ status: 'abandoned', completed_at: new Date().toISOString() })
        .eq('id', interviewId)
        .in('status', ['pending', 'in_progress'])
        .select('id');
      if (!abandonError && Array.isArray(abandonedRows) && abandonedRows.length > 0) {
        try {
          persistMilestoneEventOnce('interview_abandoned', {
            user_id: user.id,
            interview_id: interviewId,
            previous_status: previousStatus,
            source: 'exit_feedback',
          });
        } catch (err) {
          console.warn('[interview/exit-feedback] interview_abandoned milestone threw (ignored)', {
            interviewId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Upsert exit feedback record for idempotency
    const { data: insertedRow, error: insertError } = await serviceClient
      .from('interview_exit_feedbacks')
      .upsert(
        {
          user_id: user.id,
          interview_id: interviewId,
          exit_reason: exitReason,
          issue_type: issueType ?? '',
          comment: comment ?? '',
          question_index: questionIndex ?? null,
          progress_percent: progressPercent ?? null,
          engine: engine || interview.engine || 'script',
          device_info: deviceInfo ?? null,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'interview_id' },
      )
      .select(
        'id, exit_reason, issue_type, comment, question_index, progress_percent, engine, submitted_at, created_at',
      )
      .single();

    if (insertError || !insertedRow) {
      console.error('[interview/exit-feedback] DB insert/upsert failed:', insertError?.message);
      return NextResponse.json(
        { error: 'Failed to save exit feedback. Please try again.' },
        { status: 502 },
      );
    }

    trackProductEventServer({
      event_name: 'interview_exit_feedback_submitted',
      user_id: user.id,
      interview_id: interviewId,
      exit_reason: exitReason,
      issue_type: issueType,
    });

    return NextResponse.json({ ok: true, feedback: insertedRow }, { status: 200 });
  } catch (err) {
    console.error('[interview/exit-feedback] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * GET /api/interview/exit-feedback?interviewId=...
 *
 * Retrieves existing exit feedback for a specific interview owned by the caller.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = getQuerySchema.safeParse({
      interviewId: searchParams.get('interviewId'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid interview ID query.' },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();
    const { data: feedback, error: feedbackError } = await serviceClient
      .from('interview_exit_feedbacks')
      .select(
        'id, exit_reason, issue_type, comment, question_index, progress_percent, engine, submitted_at, created_at',
      )
      .eq('interview_id', parsed.data.interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (feedbackError) {
      console.error('[interview/exit-feedback] query failed:', feedbackError.message);
      return NextResponse.json({ error: 'Failed to fetch exit feedback.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, feedback: feedback ?? null }, { status: 200 });
  } catch (err) {
    console.error('[interview/exit-feedback] GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
