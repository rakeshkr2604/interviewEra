import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { interviewFeedbackSubmitSchema } from '@/lib/validations/interview-feedback';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const getQuerySchema = z.object({
  interviewId: z.string().uuid('Invalid interview ID.'),
});

/**
 * POST /api/interview/feedback
 *
 * Saves after-interview feedback for a specific completed interview session.
 * Enforces authenticated user ownership and idempotency via ON CONFLICT (interview_id).
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

    const rl = await checkRateLimit(`interview-feedback:${user.id}`, 60, 10);
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

    const parsed = interviewFeedbackSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid feedback input.' },
        { status: 400 },
      );
    }

    const { interviewId, rating, likedAspect, issueType, comment, deviceInfo } = parsed.data;

    const serviceClient = createServiceClient();

    // Verify interview exists and belongs to the authenticated user
    const { data: interview, error: interviewError } = await serviceClient
      .from('interviews')
      .select('id, user_id, status, role')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (interviewError) {
      console.error('[interview/feedback] interview lookup failed:', interviewError.message);
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

    // Upsert feedback record for idempotency (prevents double submits/retries from erroring)
    const { data: insertedRow, error: insertError } = await serviceClient
      .from('interview_feedbacks')
      .upsert(
        {
          user_id: user.id,
          interview_id: interviewId,
          rating,
          liked_aspect: likedAspect ?? '',
          issue_type: issueType ?? '',
          comment: comment ?? '',
          device_info: deviceInfo ?? null,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'interview_id' },
      )
      .select('id, rating, liked_aspect, issue_type, comment, submitted_at, created_at')
      .single();

    if (insertError || !insertedRow) {
      console.error('[interview/feedback] DB insert/upsert failed:', insertError?.message);
      return NextResponse.json(
        { error: 'Failed to save feedback. Please try again.' },
        { status: 502 },
      );
    }

    trackProductEventServer({
      event_name: 'after_interview_feedback_submitted',
      user_id: user.id,
      interview_id: interviewId,
      rating,
      liked_aspect: likedAspect,
      issue_type: issueType,
    });

    return NextResponse.json({ ok: true, feedback: insertedRow }, { status: 200 });
  } catch (err) {
    console.error('[interview/feedback] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * GET /api/interview/feedback?interviewId=...
 *
 * Retrieves existing feedback for a specific interview owned by the caller.
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
      .from('interview_feedbacks')
      .select('id, rating, liked_aspect, issue_type, comment, submitted_at, created_at')
      .eq('interview_id', parsed.data.interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (feedbackError) {
      console.error('[interview/feedback] query failed:', feedbackError.message);
      return NextResponse.json({ error: 'Failed to fetch feedback.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, feedback: feedback ?? null }, { status: 200 });
  } catch (err) {
    console.error('[interview/feedback] GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
