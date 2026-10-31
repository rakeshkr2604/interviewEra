/**
 * Server-side primary recovery target for V2.1 — independent of dashboard
 * recent-list pagination (limit 20 / slice 5).
 *
 * Deterministic rule:
 * 1. Newest active resumable v2.1 (`pending` | `in_progress`) by started_at
 * 2. Else newest abandoned v2.1 with credit_deducted && !abandoned_resume_used
 */

import { isAbandonedContinueEligible, isResumableInterviewStatus } from '@/lib/interview/interview-status';

export const RECOVERY_INTERVIEW_SELECT =
  'id, role, status, engine, started_at, credit_deducted, abandoned_resume_used' as const;

export type RecoveryInterviewRow = {
  id: string;
  role: string;
  status: string;
  engine: string | null;
  started_at: string | null;
  credit_deducted: boolean | null;
  abandoned_resume_used: boolean | null;
};

export type PrimaryRecoveryTarget = {
  id: string;
  role: string;
  engine: string | null;
  status: string;
  mode: 'continue' | 'resume';
};

/** Minimal PostgREST-shaped client for unit tests + live Supabase. */
export type RecoveryQueryClient = {
  from: (table: string) => {
    select: (columns: string) => RecoverySelectBuilder;
  };
};

type RecoverySelectBuilder = {
  eq: (column: string, value: string | boolean) => RecoverySelectBuilder;
  in: (column: string, values: string[]) => RecoverySelectBuilder;
  or?: (filter: string) => RecoverySelectBuilder;
  order: (
    column: string,
    opts: { ascending: boolean },
  ) => RecoverySelectBuilder;
  limit: (count: number) => PromiseLike<{
    data: RecoveryInterviewRow[] | null;
    error: { message: string } | null;
  }>;
};

function toTarget(
  row: RecoveryInterviewRow,
  mode: 'continue' | 'resume',
): PrimaryRecoveryTarget {
  return {
    id: row.id,
    role: row.role,
    engine: row.engine,
    status: row.status,
    mode,
  };
}

/**
 * Resolve the primary recovery target from already-fetched rows (tests /
 * in-memory). Prefer active; else newest eligible abandoned. Ignores completed
 * and ineligible abandoned. Caller must not pass a pagination-truncated window
 * when using this for production hero/notification selection — use
 * {@link fetchPrimaryRecoveryInterview} instead.
 */
export function resolvePrimaryRecoveryTarget(
  rows: RecoveryInterviewRow[],
): PrimaryRecoveryTarget | null {
  const v21 = rows.filter((r) => r.engine === 'v2.1');
  const active = v21.find((r) => isResumableInterviewStatus(r.status));
  if (active) return toTarget(active, 'continue');

  const abandoned = v21.find((r) =>
    isAbandonedContinueEligible({
      status: r.status,
      creditDeducted: r.credit_deducted,
      abandonedResumeUsed: r.abandoned_resume_used,
    }),
  );
  if (abandoned) return toTarget(abandoned, 'resume');
  return null;
}

/** Eligible-only recovery rows: active, or abandoned with an unused continue. */
const RECOVERY_ELIGIBLE_FILTER =
  'status.in.(pending,in_progress),and(status.eq.abandoned,credit_deducted.is.true,abandoned_resume_used.is.false)' as const;

/**
 * One bounded indexed query — the `or` filter returns only recovery-eligible
 * rows, so the 50-row cap can never be crowded out by ineligible history, and
 * {@link resolvePrimaryRecoveryTarget} applies the active-before-abandoned rule
 * over that window. Eligibility is re-verified in JS, so the SQL filter is a
 * narrowing optimization rather than the source of truth.
 *
 * `client` is intentionally loose-typed so both the user-scoped Supabase
 * server client and unit mocks are accepted without casting.
 */
export async function fetchPrimaryRecoveryInterview(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase builder variance
  client: any,
  userId: string,
): Promise<PrimaryRecoveryTarget | null> {
  const builder = client
    .from('interviews')
    .select(RECOVERY_INTERVIEW_SELECT)
    .eq('user_id', userId)
    .eq('engine', 'v2.1');

  // Mocks that predate the combined query expose no `.or` — fall back to the
  // status-only window, which resolvePrimaryRecoveryTarget filters anyway.
  const filtered =
    typeof builder.or === 'function'
      ? builder.or(RECOVERY_ELIGIBLE_FILTER)
      : builder.in('status', ['pending', 'in_progress', 'abandoned']);

  const result = await filtered.order('started_at', { ascending: false }).limit(50);

  if (result.error) {
    console.error('[recovery] query failed', result.error.message);
    return null;
  }

  return resolvePrimaryRecoveryTarget((result.data ?? []) as RecoveryInterviewRow[]);
}
