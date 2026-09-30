/**
 * Proactive stale V2.1 session cleanup — same 45-minute policy as
 * create_interview_with_credit / migration 096 (ACTIVE_INTERVIEW_STALE_AFTER_MS).
 * No credit refund. Idempotent. Service-role RPC only.
 *
 * After successful transitions, attempts durable interview_abandoned milestones
 * (awaited) for each returned row. Milestone failure does not fail abandonment.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ACTIVE_INTERVIEW_STALE_AFTER_MS } from '@/lib/interview/active-interview-policy';
import { persistMilestoneEventOnceAsync } from '@/lib/analytics/milestone-events-store';

export const ABANDON_STALE_ACTIVE_INTERVIEWS_RPC = 'abandon_stale_active_interviews';

/** Exposed for tests — must stay aligned with SQL INTERVAL '45 minutes'. */
export function staleActiveInterviewCutoffIso(nowMs: number = Date.now()): string {
  return new Date(nowMs - ACTIVE_INTERVIEW_STALE_AFTER_MS).toISOString();
}

export type AbandonedInterviewRow = {
  interview_id: string;
  user_id: string;
};

export type AbandonStaleActiveResult =
  | {
      ok: true;
      abandoned: number;
      milestoneAttempts: number;
      milestoneFailures: number;
    }
  | { ok: false; error: string };

function parseAbandonedRows(data: unknown): AbandonedInterviewRow[] | null {
  if (data == null) return [];
  if (!Array.isArray(data)) return null;

  const rows: AbandonedInterviewRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    const interviewId = row.interview_id;
    const userId = row.user_id;
    if (typeof interviewId !== 'string' || typeof userId !== 'string') return null;
    if (!interviewId || !userId) return null;
    rows.push({ interview_id: interviewId, user_id: userId });
  }
  return rows;
}

export async function abandonStaleActiveInterviews(
  serviceClient: SupabaseClient,
): Promise<AbandonStaleActiveResult> {
  const { data, error } = await serviceClient.rpc(ABANDON_STALE_ACTIVE_INTERVIEWS_RPC);

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = parseAbandonedRows(data);
  if (rows === null) {
    return { ok: false, error: 'Unexpected RPC return value' };
  }

  let milestoneAttempts = 0;
  let milestoneFailures = 0;

  for (const row of rows) {
    milestoneAttempts += 1;
    const milestone = await persistMilestoneEventOnceAsync('interview_abandoned', {
      user_id: row.user_id,
      interview_id: row.interview_id,
      engine: 'v2.1',
      source: 'stale_cron',
    });
    if (!milestone.ok) {
      milestoneFailures += 1;
    }
  }

  return {
    ok: true,
    abandoned: rows.length,
    milestoneAttempts,
    milestoneFailures,
  };
}
