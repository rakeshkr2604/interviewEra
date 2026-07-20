/**
 * After a v2.1 script report becomes emailable, send the completion email if
 * it was previously skipped (e.g. insufficient_report while scores were still
 * landing). Idempotent via lifecycle_email_log.
 *
 * Called from loadOrGenerateScriptReport — NOT from trySendScriptCompletionEmail
 * itself (that would recurse).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  reportHasEmailableScores,
  trySendScriptCompletionEmail,
  type TrySendScriptCompletionEmailResult,
} from '@/lib/email/lifecycle/try-send-script-completion-email'
import { wasLifecycleEmailSent } from '@/lib/email/lifecycle/log'
import type { ScriptInterviewReportRecord } from '@/lib/interview/script-report/generate'

const LOG_PREFIX = '[owed-script-completion-email]'

export type SendOwedScriptCompletionEmailArgs = {
  serviceClient: SupabaseClient
  interviewId: string
  userId: string
  report: Pick<
    ScriptInterviewReportRecord,
    'overall' | 'dimension_averages' | 'scored_answer_count' | 'status'
  >
}

/**
 * If the report is emailable and no successful completion email exists yet,
 * send it now (waitForScores=false — scores already backed this report).
 */
export async function sendOwedScriptCompletionEmailIfReportReady(
  args: SendOwedScriptCompletionEmailArgs,
): Promise<TrySendScriptCompletionEmailResult | { attempted: false; sent: false; skippedReason: string }> {
  const { serviceClient, interviewId, userId, report } = args
  const idempotencyKey = `script_interview_completed:${interviewId}`

  if (!reportHasEmailableScores(report)) {
    return { attempted: false, sent: false, skippedReason: 'report_not_emailable' }
  }

  if (await wasLifecycleEmailSent(idempotencyKey)) {
    return { attempted: false, sent: false, skippedReason: 'already_sent' }
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle<{ email: string | null }>()

  if (profileError) {
    console.error(`${LOG_PREFIX} user email lookup failed`, {
      interviewId,
      userId,
      error: profileError.message,
    })
    return { attempted: false, sent: false, skippedReason: 'email_lookup_failed' }
  }

  const recipientEmail = profile?.email?.trim() ?? ''
  if (!recipientEmail) {
    console.warn(`${LOG_PREFIX} skip — no recipient email on user`, { interviewId, userId })
    return { attempted: false, sent: false, skippedReason: 'no_recipient' }
  }

  console.info(`${LOG_PREFIX} sending owed completion email (report ready)`, {
    interviewId,
    reportStatus: report.status,
    scored_answer_count: report.scored_answer_count,
  })

  return trySendScriptCompletionEmail({
    serviceClient,
    interviewId,
    userId,
    recipientEmail,
    waitForScores: false,
    /** Prevent recurse: trySend → loadOrGenerate → owed send → trySend… */
    skipReportLoadSideEffects: true,
  })
}

/** Fire-and-forget wrapper with logging — safe to call from report generation. */
export function queueOwedScriptCompletionEmailIfReportReady(
  args: SendOwedScriptCompletionEmailArgs,
): void {
  void sendOwedScriptCompletionEmailIfReportReady(args)
    .then((r) => {
      if (r.sent) {
        console.info(`${LOG_PREFIX} delivered`, { interviewId: args.interviewId })
      } else if (r.skippedReason && r.skippedReason !== 'already_sent' && r.skippedReason !== 'report_not_emailable') {
        console.error(`${LOG_PREFIX} not delivered`, {
          interviewId: args.interviewId,
          ...r,
        })
      }
    })
    .catch((err) => {
      console.error(`${LOG_PREFIX} threw`, {
        interviewId: args.interviewId,
        error: err instanceof Error ? err.message : String(err),
      })
    })
}
