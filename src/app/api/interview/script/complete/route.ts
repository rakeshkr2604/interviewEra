import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { loadOrGenerateScriptReport } from '@/lib/interview/script-report/generate';
import { sendScriptInterviewCompletedEmail } from '@/lib/email/lifecycle/send-script-interview-completed';
import type { DimensionKey } from '@/lib/interview/answer-score/rubric';

const completeSchema = z.object({
  interviewId: z.string().uuid(),
  performanceBucket: z.enum(['strong', 'average', 'low']),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  let interviewIdForLog = 'unknown';
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

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = completeSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          fieldErrors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { interviewId, performanceBucket } = validation.data;
    interviewIdForLog = interviewId;

    // Step 2 — ownership + not-already-completed
    const serviceClient = createServiceClient();
    const { data: ownership, error: ownershipError } = await serviceClient
      .from('interviews')
      .select('id, status')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .eq('engine', 'v2.1')
      .maybeSingle();

    if (ownershipError) {
      console.error(`[interview/script/complete] ownership query failed (interviewId=${interviewId}):`, ownershipError);
      return NextResponse.json({ error: 'Failed to load interview' }, { status: 500 });
    }
    if (!ownership) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }
    if (ownership.status === 'completed') {
      return NextResponse.json({ error: 'Interview already completed' }, { status: 400 });
    }

    // Step 3 — mark complete
    const { error: updateError } = await serviceClient
      .from('interviews')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        performance_bucket: performanceBucket,
      })
      .eq('id', interviewId);

    if (updateError) {
      console.error(`[interview/script/complete] update failed (interviewId=${interviewId}):`, updateError);
      return NextResponse.json({ error: 'Failed to complete interview' }, { status: 500 });
    }

    const recipientEmail = user.email?.trim() ?? '';

    // Warm report via Next.js after() → platform waitUntil when available
    // (Vercel). Survives after the response is sent; not a void fire-and-forget.
    // Generate-on-view remains the safety net with generating-claim idempotency.
    // Completion email fires after report is ready (needs scores + synthesis).
    after(() => {
      void loadOrGenerateScriptReport({
        serviceClient,
        interviewId,
        userId: user.id,
      })
        .then(async (result) => {
          if (!result.ok) {
            console.warn(
              `[interview/script/complete] after() report warm failed (interviewId=${interviewId}): ${result.error}`,
            );
            return;
          }
          console.info(
            `[interview/script/complete] after() report warm ok (interviewId=${interviewId}, status=${result.report.status}, created=${result.created})`,
          );

          if (!recipientEmail) {
            console.warn(
              `[interview/script/complete] skip completion email — no user email (interviewId=${interviewId})`,
            );
            return;
          }

          const report = result.report;
          if (
            report.overall == null ||
            !report.dimension_averages ||
            report.scored_answer_count <= 0
          ) {
            console.info(
              `[interview/script/complete] skip completion email — insufficient report data (interviewId=${interviewId}, status=${report.status})`,
            );
            return;
          }

          await sendScriptInterviewCompletedEmail({
            interviewId,
            userId: user.id,
            recipientEmail,
            overallScore10: Number(report.overall),
            dimensionAverages: report.dimension_averages as Record<DimensionKey, number>,
            scoredAnswerCount: report.scored_answer_count,
            synthesis: report.synthesis,
          });
        })
        .catch((err) => {
          console.error(
            `[interview/script/complete] after() report/email failed (interviewId=${interviewId}):`,
            err,
          );
        });
    });

    // Step 4 — done
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error(`[interview/script/complete] Unexpected error (interviewId=${interviewIdForLog}):`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
