/**
 * Pure aggregation for /api/admin/recent-users interview columns.
 *
 * COMPLETED = transactional `status === 'completed'` only (not product_events).
 * LAST INTERVIEW = activity/start timestamp — prefer `started_at`.
 * Do not treat abandoned.completed_at as successful-completion time.
 */

export type InterviewAggRow = {
  user_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
};

export type UserInterviewAgg = {
  total: number;
  pending: number;
  completed: number;
  lastAt: string | null;
};

export function isPendingInterviewStatus(status: string): boolean {
  return status === 'pending' || status === 'in_progress';
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
    if (isPendingInterviewStatus(iv.status)) prev.pending += 1;
    if (iv.status === 'completed') prev.completed += 1;

    const ts = interviewLastActivityAt(iv);
    if (ts && (!prev.lastAt || ts > prev.lastAt)) prev.lastAt = ts;

    interviewAgg.set(iv.user_id, prev);
  }

  return interviewAgg;
}
