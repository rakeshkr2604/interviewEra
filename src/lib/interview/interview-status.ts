/**
 * Single source of truth for which interview statuses are resumable.
 *
 * The server write paths (answer, script turn, abandon) only accept
 * interviews in `pending`/`in_progress`; `completed`/`abandoned` are terminal
 * (checkpoint returns 409, answer routes return 400). Any UI that offers to
 * open a session as-is MUST use `isResumableInterviewStatus`. Abandoned
 * interviews may be offered one history-continue only after
 * `resume_abandoned_interview` reopens the same row to `in_progress`.
 */

export type TerminalInterviewStatus = 'completed' | 'abandoned';

export function isResumableInterviewStatus(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'in_progress';
}

export function isAbandonedContinueEligible(opts: {
  status: string | null | undefined;
  abandonedResumeUsed?: boolean | null;
  creditDeducted?: boolean | null;
}): boolean {
  return (
    opts.status === 'abandoned' &&
    opts.abandonedResumeUsed !== true &&
    opts.creditDeducted === true
  );
}

export function shouldOfferHistoryContinue(opts: {
  status: string | null | undefined;
  abandonedResumeUsed?: boolean | null;
  creditDeducted?: boolean | null;
}): boolean {
  return isResumableInterviewStatus(opts.status) || isAbandonedContinueEligible(opts);
}

export function isTerminalInterviewStatus(
  status: string | null | undefined,
): status is TerminalInterviewStatus {
  return status === 'completed' || status === 'abandoned';
}
