/**
 * Script interview completion email — shared by complete route + report route.
 * Fixes the race where complete()'s after() generated insufficient_data before
 * answer_evaluations finished scoring, then permanently skipped the email.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { loadOrGenerateScriptReport } from '@/lib/interview/script-report/generate';
import { sendScriptInterviewCompletedEmail } from '@/lib/email/lifecycle/send-script-interview-completed';
import { wasLifecycleEmailSent } from '@/lib/email/lifecycle/log';
import type { DimensionKey } from '@/lib/interview/answer-score/rubric';

const LOG_PREFIX = '[script-completion-email]';
const SCORE_WAIT_MS = 45_000;
const SCORE_POLL_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function reportHasEmailableScores(report: {
  overall: number | null;
  dimension_averages: unknown;
  scored_answer_count: number;
}): boolean {
  return (
    report.overall != null &&
    Boolean(report.dimension_averages) &&
    report.scored_answer_count > 0
  );
}

async function countScoredEvals(
  serviceClient: SupabaseClient,
  interviewId: string,
): Promise<number> {
  const { count, error } = await serviceClient
    .from('answer_evaluations')
    .select('id', { count: 'exact', head: true })
    .eq('interview_id', interviewId)
    .eq('status', 'scored');
  if (error) {
    console.warn(`${LOG_PREFIX} scored-eval count failed`, {
      interviewId,
      error: error.message,
    });
    return 0;
  }
  return count ?? 0;
}

/** Poll until at least one scored evaluation exists or timeout. */
export async function waitForScoredEvaluations(
  serviceClient: SupabaseClient,
  interviewId: string,
  opts?: { timeoutMs?: number; pollMs?: number },
): Promise<number> {
  const timeoutMs = opts?.timeoutMs ?? SCORE_WAIT_MS;
  const pollMs = opts?.pollMs ?? SCORE_POLL_MS;
  const deadline = Date.now() + timeoutMs;
  let last = 0;
  while (Date.now() < deadline) {
    last = await countScoredEvals(serviceClient, interviewId);
    if (last > 0) return last;
    await sleep(pollMs);
  }
  return last;
}

export type TrySendScriptCompletionEmailResult = {
  attempted: boolean;
  sent: boolean;
  skippedReason?: string;
  providerMessageId?: string;
  error?: string;
};

/**
 * Load/generate report (retrying past sticky insufficient_data once scores exist)
 * and send the completion email if not already sent.
 */
export async function trySendScriptCompletionEmail(args: {
  serviceClient: SupabaseClient;
  interviewId: string;
  userId: string;
  recipientEmail: string;
  /** When true, wait briefly for answer_evaluations to land before generating. */
  waitForScores?: boolean;
}): Promise<TrySendScriptCompletionEmailResult> {
  const { serviceClient, interviewId, userId, recipientEmail } = args;
  const idempotencyKey = `script_interview_completed:${interviewId}`;

  if (!recipientEmail.trim()) {
    console.warn(`${LOG_PREFIX} skip — empty recipient`, { interviewId });
    return { attempted: false, sent: false, skippedReason: 'no_recipient' };
  }

  if (await wasLifecycleEmailSent(idempotencyKey)) {
    console.info(`${LOG_PREFIX} skip — already sent`, { interviewId });
    return { attempted: false, sent: false, skippedReason: 'already_sent' };
  }

  if (args.waitForScores !== false) {
    const scored = await waitForScoredEvaluations(serviceClient, interviewId);
    console.info(`${LOG_PREFIX} scored-eval wait done`, { interviewId, scored });
  }

  let result = await loadOrGenerateScriptReport({
    serviceClient,
    interviewId,
    userId,
  });

  if (!result.ok) {
    console.warn(`${LOG_PREFIX} report load failed`, {
      interviewId,
      error: result.error,
    });
    return {
      attempted: true,
      sent: false,
      skippedReason: 'report_load_failed',
      error: result.error,
    };
  }

  // Sticky insufficient_data from a complete/score race — regenerate once scores exist.
  if (!reportHasEmailableScores(result.report)) {
    const scoredNow = await countScoredEvals(serviceClient, interviewId);
    if (scoredNow > 0) {
      console.info(`${LOG_PREFIX} regenerating report after scores arrived`, {
        interviewId,
        scoredNow,
        priorStatus: result.report.status,
      });
      result = await loadOrGenerateScriptReport({
        serviceClient,
        interviewId,
        userId,
        forceRegenerate: true,
      });
      if (!result.ok) {
        return {
          attempted: true,
          sent: false,
          skippedReason: 'report_regen_failed',
          error: result.error,
        };
      }
    }
  }

  const report = result.report;
  if (!reportHasEmailableScores(report)) {
    console.info(`${LOG_PREFIX} skip — insufficient report data`, {
      interviewId,
      status: report.status,
      scored_answer_count: report.scored_answer_count,
    });
    return {
      attempted: true,
      sent: false,
      skippedReason: `insufficient_report:${report.status}`,
    };
  }

  try {
    await sendScriptInterviewCompletedEmail({
      interviewId,
      userId,
      recipientEmail: recipientEmail.trim(),
      overallScore10: Number(report.overall),
      dimensionAverages: report.dimension_averages as Record<DimensionKey, number>,
      scoredAnswerCount: report.scored_answer_count,
      synthesis: report.synthesis,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} send threw`, { interviewId, error });
    return { attempted: true, sent: false, error };
  }

  // Re-check log for provider id / success (sendScript logs failures without throwing).
  const sent = await wasLifecycleEmailSent(idempotencyKey);
  if (sent) {
    console.info(`${LOG_PREFIX} delivered (lifecycle_email_log=sent)`, { interviewId });
    return { attempted: true, sent: true };
  }

  console.error(`${LOG_PREFIX} send finished but lifecycle log not marked sent`, {
    interviewId,
  });
  return {
    attempted: true,
    sent: false,
    skippedReason: 'send_returned_without_log',
  };
}
