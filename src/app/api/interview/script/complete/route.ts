import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { trySendScriptCompletionEmail } from '@/lib/email/lifecycle/try-send-script-completion-email';
import { wasLifecycleEmailSent } from '@/lib/email/lifecycle/log';

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

    // Step 2 — ownership
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

    const recipientEmail = user.email?.trim() ?? '';
    const idempotencyKey = `script_interview_completed:${interviewId}`;

    // Already completed — repair path: re-fire email if never sent (parity with v1).
    if (ownership.status === 'completed') {
      if (recipientEmail && !(await wasLifecycleEmailSent(idempotencyKey))) {
        after(() => {
          void trySendScriptCompletionEmail({
            serviceClient,
            interviewId,
            userId: user.id,
            recipientEmail,
            waitForScores: true,
          })
            .then((r) => {
              console.info(
                `[interview/script/complete] repair email result (interviewId=${interviewId}):`,
                r,
              );
            })
            .catch((err) => {
              console.error(
                `[interview/script/complete] repair email failed (interviewId=${interviewId}):`,
                err,
              );
            });
        });
        return NextResponse.json(
          { success: true, alreadyCompleted: true, emailRepairQueued: true },
          { status: 200 },
        );
      }
      // Turn-route completion is source of truth; client repair PATCH is not an error.
      return NextResponse.json(
        { success: true, alreadyCompleted: true },
        { status: 200 },
      );
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

    // Warm report + send email after scores land (wait inside trySend).
    // Survives via Next.js after() → platform waitUntil when available.
    after(() => {
      void trySendScriptCompletionEmail({
        serviceClient,
        interviewId,
        userId: user.id,
        recipientEmail,
        waitForScores: true,
      })
        .then((r) => {
          console.info(
            `[interview/script/complete] after() email result (interviewId=${interviewId}):`,
            JSON.stringify(r),
          );
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
