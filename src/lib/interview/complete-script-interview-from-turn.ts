/**
 * Mark a v2.1 script interview completed and queue the completion email.
 * Shared by the turn route (closing / turn-cap / CQ exit) so completion is
 * not dependent on a second client round-trip.
 *
 * Durable analytics: after a real pending/in_progress → completed transition,
 * attempt at-most-one durable `interview_completed` via persistMilestoneEventOnce
 * (migration 052 unique index). Analytics must never fail the business completion.
 *
 * The UPDATE itself requires status IN ('pending','in_progress') so a concurrent
 * abandon cannot be overwritten to completed.
 */

import { after } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store'
import {
  trySendScriptCompletionEmail,
  waitForScoredEvaluations,
} from '@/lib/email/lifecycle/try-send-script-completion-email'
import { processInterviewRetentionSafely } from '@/lib/retention/process-interview-complete'
import { loadOrGenerateScriptReport } from '@/lib/interview/script-report/generate'

const LOG_PREFIX = '[script-turn-complete]'

const ACTIVE_STATUSES = ['pending', 'in_progress'] as const

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
  | { ok: true; transitioned: boolean }
  | { ok: false; error: string }

function voidCompletionEmail(args: {
  serviceClient: SupabaseClient
  interviewId: string
  userId: string
  recipientEmail: string
}): void {
  const { serviceClient, interviewId, userId, recipientEmail } = args
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
}

function emitInterviewCompleted(userId: string, interviewId: string): void {
  try {
    persistMilestoneEventOnce('interview_completed', {
      user_id: userId,
      interview_id: interviewId,
      engine: 'v2.1',
    })
  } catch (err) {
    console.warn(`${LOG_PREFIX} interview_completed milestone threw (ignored)`, {
      interviewId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

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

  // Authoritative transition guard lives on the UPDATE — not a pre-read.
  const { data: updatedRows, error: updateError } = await serviceClient
    .from('interviews')
    .update({
      ...(extraInterviewUpdate ?? {}),
      current_turn_index: currentTurnIndex,
      status: 'completed',
      performance_bucket: performanceBucket,
      completed_at: new Date().toISOString(),
    })
    .eq('id', interviewId)
    .in('status', [...ACTIVE_STATUSES])
    .select('id')

  if (updateError) {
    console.error(`${LOG_PREFIX} status update failed`, {
      interviewId,
      error: updateError.message,
    })
    return { ok: false, error: updateError.message }
  }

  const transitioned = Array.isArray(updatedRows) && updatedRows.length > 0

  if (transitioned) {
    emitInterviewCompleted(userId, interviewId)
    // Retention must never fail the business completion (degrade-don't-fail).
    // Wait for answer_evaluations the same way completion email does, so we do
    // not permanently skip quality logging when the last score is still in flight.
    after(() => {
      void (async () => {
        const scored = await waitForScoredEvaluations(serviceClient, interviewId)
        console.info(`${LOG_PREFIX} retention scored-eval wait done`, {
          interviewId,
          scored,
        })
        // Retention and the v2.1 report both only need scores — run them
        // together so the report is pre-warmed in the cache by the time the
        // candidate opens it (feedback step is optional and often skipped,
        // so View Report is frequently the very next click).
        const [payload] = await Promise.all([
          processInterviewRetentionSafely(userId, interviewId),
          loadOrGenerateScriptReport({
            serviceClient,
            interviewId,
            userId,
            // Email is already queued by voidCompletionEmail() above.
            skipOwedCompletionEmail: true,
          })
            .then((result) => {
              console.info(`${LOG_PREFIX} report pre-warm done`, {
                interviewId,
                ok: result.ok,
                status: result.ok ? result.report.status : undefined,
                created: result.ok ? result.created : undefined,
              })
            })
            .catch((err) => {
              // Best-effort: the report route regenerates on first view if
              // this is cut off (e.g. function timeout) or fails.
              console.error(`${LOG_PREFIX} report pre-warm threw`, {
                interviewId,
                error: err instanceof Error ? err.message : String(err),
              })
            }),
        ])
        if (!payload) {
          console.warn(`${LOG_PREFIX} retention returned null`, { interviewId })
        }
      })()
    })
    voidCompletionEmail({ serviceClient, interviewId, userId, recipientEmail })
    return { ok: true, transitioned: true }
  }

  // Zero rows: concurrent abandon/complete won, or idle call. Do not emit.
  const { data: current, error: readError } = await serviceClient
    .from('interviews')
    .select('status')
    .eq('id', interviewId)
    .maybeSingle()

  if (readError) {
    console.error(`${LOG_PREFIX} post-update status read failed`, {
      interviewId,
      error: readError.message,
    })
    return { ok: false, error: readError.message }
  }

  if (current?.status === 'completed') {
    // Concurrent completer already transitioned — idempotent success, no re-emit.
    // Email repair remains the job of PATCH .../script/complete.
    return { ok: true, transitioned: false }
  }

  console.warn(`${LOG_PREFIX} no active row transitioned`, {
    interviewId,
    status: current?.status ?? null,
  })
  return {
    ok: false,
    error:
      current?.status === 'abandoned'
        ? 'Interview was abandoned before completion'
        : 'Interview is not active and cannot be completed',
  }
}
