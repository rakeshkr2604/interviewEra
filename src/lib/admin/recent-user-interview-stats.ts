/**
 * Pure aggregation for /api/admin/recent-users interview columns.
 *
 * INCOMPLETE (`pending` / `pending_interviews` API field): transactional status
 * is `pending`, `in_progress`, or `abandoned` — unfinished interviews.
 * COMPLETED = transactional `status === 'completed'` only (not product_events).
 * LAST INTERVIEW = activity/start timestamp — prefer `started_at`.
 * Do not treat abandoned.completed_at as successful-completion time.
 *
 * Unknown statuses increment `total` only (neither incomplete nor completed).
 */

export type InterviewAggRow = {
  user_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
};

export type UserInterviewAgg = {
  total: number;
  /**
   * Incomplete count (API field `pending_interviews`).
   * Includes pending, in_progress, and abandoned.
   */
  pending: number;
  completed: number;
  lastAt: string | null;
};

/** Unfinished interview statuses counted in the admin Incomplete column. */
export function isIncompleteInterviewStatus(status: string): boolean {
  return (
    status === 'pending' ||
    status === 'in_progress' ||
    status === 'abandoned'
  );
}

/**
 * @deprecated Prefer `isIncompleteInterviewStatus` — same predicate; kept for
 * call-site clarity where the API field is still named `pending`.
 */
export function isPendingInterviewStatus(status: string): boolean {
  return isIncompleteInterviewStatus(status);
}

/**
 * Timestamp used for admin "LAST INTERVIEW".
 * Prefer started_at (attempt/activity). Fall back to completed_at only when
 * the row is a successful completion missing started_at.
 */
export function interviewLastActivityAt(iv: {
  status: string;
  started_at: string | null;
  completed_at: string | null;
}): string | null {
  if (iv.started_at) return iv.started_at;
  if (iv.status === 'completed' && iv.completed_at) return iv.completed_at;
  return null;
}

export function aggregateInterviewsByUser(
  interviews: InterviewAggRow[],
): Map<string, UserInterviewAgg> {
  const interviewAgg = new Map<string, UserInterviewAgg>();

  for (const iv of interviews) {
    const prev = interviewAgg.get(iv.user_id) ?? {
      total: 0,
      pending: 0,
      completed: 0,
      lastAt: null,
    };
    prev.total += 1;
    if (isIncompleteInterviewStatus(iv.status)) prev.pending += 1;
    if (iv.status === 'completed') prev.completed += 1;

    const ts = interviewLastActivityAt(iv);
    if (ts && (!prev.lastAt || ts > prev.lastAt)) prev.lastAt = ts;

    interviewAgg.set(iv.user_id, prev);
  }

  return interviewAgg;
}
