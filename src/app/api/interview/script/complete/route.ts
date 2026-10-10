import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store';
import { trySendScriptCompletionEmail } from '@/lib/email/lifecycle/try-send-script-completion-email';
import { wasLifecycleEmailSent } from '@/lib/email/lifecycle/log';
import { processInterviewRetentionSafely } from '@/lib/retention/process-interview-complete';
import { waitForScoredEvaluations } from '@/lib/email/lifecycle/try-send-script-completion-email';

/** Best-effort durable completion milestone — never throws into the request. */
function emitScriptInterviewCompleted(userId: string, interviewId: string): void {
  try {
    persistMilestoneEventOnce('interview_completed', {
      user_id: userId,
      interview_id: interviewId,
      engine: 'v2.1',
    });
  } catch (err) {
    console.warn('[interview/script/complete] interview_completed milestone threw (ignored)', {
      interviewId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const completeSchema = z.object({
  interviewId: z.string().uuid(),
  /**
   * @deprecated Client-supplied bucket is ignored. Kept optional for request compatibility.
   * Server always persists a safe default on this repair path (turn-route completion is SoT).
   */
  performanceBucket: z.enum(['strong', 'average', 'low']).optional(),
});

async function runRetentionAfterScores(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  interviewId: string,
) {
  await waitForScoredEvaluations(serviceClient, interviewId);
  return processInterviewRetentionSafely(userId, interviewId);
}

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

    const { interviewId } = validation.data;
    interviewIdForLog = interviewId;
    // Never trust client performanceBucket — repair PATCH is not the scoring authority.
    const performanceBucket = 'average' as const;

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
    // Also re-emit durable interview_completed (052 unique index = exactly once).
    // Retention runs in-request so the client can refresh streak from the response
    // (turn-path after() may have raced or failed silently).
    if (ownership.status === 'completed') {
      emitScriptInterviewCompleted(user.id, interviewId);
      const retention = await runRetentionAfterScores(serviceClient, user.id, interviewId);
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
          {
            success: true,
            alreadyCompleted: true,
            emailRepairQueued: true,
            retention,
          },
          { status: 200 },
        );
      }
      // Turn-route completion is source of truth; client repair PATCH is not an error.
      return NextResponse.json(
        { success: true, alreadyCompleted: true, retention },
        { status: 200 },
      );
    }

    // Do not complete abandoned / terminal non-active rows via this repair path.
    if (ownership.status !== 'in_progress' && ownership.status !== 'pending') {
      return NextResponse.json(
        { error: 'Interview cannot be completed from this status.', status: ownership.status },
        { status: 400 },
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

    emitScriptInterviewCompleted(user.id, interviewId);

    // Retention in-request (authoritative for client streak refresh). Email stays
    // in after() so a slow Resend call cannot block the completion response.
    const retention = await runRetentionAfterScores(serviceClient, user.id, interviewId);

    after(() => {
      void (async () => {
        try {
          const r = await trySendScriptCompletionEmail({
            serviceClient,
            interviewId,
            userId: user.id,
            recipientEmail,
            waitForScores: false,
          });
          console.info(
            `[interview/script/complete] after() email result (interviewId=${interviewId}):`,
            JSON.stringify(r),
          );
        } catch (err) {
          console.error(
            `[interview/script/complete] after() report/email failed (interviewId=${interviewId}):`,
            err,
          );
        }
      })();
    });

    // Step 4 — done
    return NextResponse.json({ success: true, retention }, { status: 200 });
  } catch (err) {
    console.error(`[interview/script/complete] Unexpected error (interviewId=${interviewIdForLog}):`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
