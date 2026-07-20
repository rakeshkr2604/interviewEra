/**
 * Mark a v2.1 script interview completed and queue the completion email.
 * Shared by the turn route (closing / turn-cap / CQ exit) so completion is
 * not dependent on a second client round-trip.
 */

import { after } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { trySendScriptCompletionEmail } from '@/lib/email/lifecycle/try-send-script-completion-email'

const LOG_PREFIX = '[script-turn-complete]'

export type CompleteScriptInterviewFromTurnArgs = {
  serviceClient: SupabaseClient
  interviewId: string
  userId: string
  recipientEmail: string
  /** New current_turn_index after the closing turn is persisted. */
  currentTurnIndex: number
  performanceBucket?: 'strong' | 'average' | 'low'
  /**
   * Extra fields to merge into the interviews update (e.g. skips_used).
   * status / completed_at / performance_bucket / current_turn_index are set here.
   */
  extraInterviewUpdate?: Record<string, unknown>
}

export type CompleteScriptInterviewFromTurnResult =
  | { ok: true }
  | { ok: false; error: string }

export async function completeScriptInterviewFromTurn(
  args: CompleteScriptInterviewFromTurnArgs,
): Promise<CompleteScriptInterviewFromTurnResult> {
  const {
    serviceClient,
    interviewId,
    userId,
    recipientEmail,
    currentTurnIndex,
    performanceBucket = 'average',
    extraInterviewUpdate,
  } = args

  // Idempotent overwrite — safe if already completed (client repair / duplicate).
  const { error: updateError } = await serviceClient
    .from('interviews')
    .update({
      ...(extraInterviewUpdate ?? {}),
      current_turn_index: currentTurnIndex,
      status: 'completed',
      performance_bucket: performanceBucket,
      completed_at: new Date().toISOString(),
    })
    .eq('id', interviewId)

  if (updateError) {
    console.error(`${LOG_PREFIX} status update failed`, {
      interviewId,
      error: updateError.message,
    })
    return { ok: false, error: updateError.message }
  }

  // Always queue email (idempotent via lifecycle_email_log). Survives via after()/waitUntil.
  after(() => {
    void trySendScriptCompletionEmail({
      serviceClient,
      interviewId,
      userId,
      recipientEmail,
      waitForScores: true,
    })
      .then((r) => {
        console.info(`${LOG_PREFIX} email result`, {
          interviewId,
          ...r,
        })
        if (r.attempted && !r.sent && r.skippedReason !== 'already_sent') {
          console.error(`${LOG_PREFIX} email not delivered`, {
            interviewId,
            skippedReason: r.skippedReason,
            error: r.error,
          })
        }
      })
      .catch((err) => {
        console.error(`${LOG_PREFIX} email threw`, {
          interviewId,
          error: err instanceof Error ? err.message : String(err),
        })
      })
  })

  return { ok: true }
}
