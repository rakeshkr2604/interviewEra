/**
 * Single source of truth for which interview statuses are resumable.
 *
 * The server write paths (answer, process-answer, checkpoint) only accept
 * interviews in `pending`/`in_progress`; `completed`/`abandoned` are terminal
 * (checkpoint returns 409, answer routes return 400). Any UI that offers to
 * open or continue a session MUST use these predicates — deriving "resumable"
 * from `status !== 'completed'` treats abandoned sessions as continuable and
 * sends candidates into a session where no answer can be saved.
 */

export type TerminalInterviewStatus = 'completed' | 'abandoned';

export function isResumableInterviewStatus(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'in_progress';
}

export function isTerminalInterviewStatus(
  status: string | null | undefined,
): status is TerminalInterviewStatus {
  return status === 'completed' || status === 'abandoned';
}
