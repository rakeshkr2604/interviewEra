/**
 * Bounded daily sweep for unfinished-interview recovery emails.
 *
 * Dry-run inventory is allowed with the feature flag off (read-only).
 * Real sends require INTERVIEW_RECOVERY_EMAIL_ENABLED=1 and dryRun=false.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  RECOVERY_EMAIL_BATCH_LIMIT,
  RECOVERY_EMAIL_FETCH_LIMIT,
  RECOVERY_EMAIL_MAX_AGE_MS,
  RECOVERY_EMAIL_R1_MIN_MS,
  RECOVERY_EMAIL_STAGES,
  isInterviewRecoveryEmailEnabled,
  isStageInWindow,
  recoveryEmailIdempotencyKey,
  type RecoveryEmailStage,
} from '@/lib/interview/recovery-email-cadence';
import { isAbandonedContinueEligible } from '@/lib/interview/interview-status';
import { sendInterviewRecoveryEmailIfEligible } from '@/lib/email/lifecycle/send-interview-recovery';
import { prefetchSentLifecycleKeys } from '@/lib/email/lifecycle/log';

export type RecoveryReminderRunStats = {
  enabled: boolean;
  dryRun: boolean;
  sendsAllowed: boolean;
  considered: number;
  eligibleAttempted: number;
  sent: number;
  skipped: number;
  failed: number;
  byStage: Record<
    RecoveryEmailStage,
    { considered: number; sent: number; skipped: number; failed: number }
  >;
  suppressReasons: Record<string, number>;
};

function emptyStageStats(): RecoveryReminderRunStats['byStage'] {
  return {
    r1: { considered: 0, sent: 0, skipped: 0, failed: 0 },
    r2: { considered: 0, sent: 0, skipped: 0, failed: 0 },
  };
}

function bumpReason(stats: RecoveryReminderRunStats, reason: string): void {
  stats.suppressReasons[reason] = (stats.suppressReasons[reason] ?? 0) + 1;
}

export async function processInterviewRecoveryReminders(
  svc: SupabaseClient,
  opts?: { dryRun?: boolean; nowMs?: number; limit?: number; fetchLimit?: number },
): Promise<RecoveryReminderRunStats> {
  const dryRun = opts?.dryRun === true;
  const enabled = isInterviewRecoveryEmailEnabled();
  const sendsAllowed = enabled && !dryRun;
  const nowMs = opts?.nowMs ?? Date.now();
  const sendBudget = Math.min(
    opts?.limit ?? RECOVERY_EMAIL_BATCH_LIMIT,
    RECOVERY_EMAIL_BATCH_LIMIT,
  );
  const fetchLimit = Math.min(
    opts?.fetchLimit ?? RECOVERY_EMAIL_FETCH_LIMIT,
    RECOVERY_EMAIL_FETCH_LIMIT,
  );

  const stats: RecoveryReminderRunStats = {
    enabled,
    dryRun,
    sendsAllowed,
    considered: 0,
    eligibleAttempted: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    byStage: emptyStageStats(),
    suppressReasons: {},
  };

  // Flag off + non-dry-run: safe no-op (no query, no send).
  if (!enabled && !dryRun) {
    bumpReason(stats, 'flag_disabled');
    return stats;
  }

  const oldestIso = new Date(nowMs - RECOVERY_EMAIL_MAX_AGE_MS).toISOString();
  const newestIso = new Date(nowMs - RECOVERY_EMAIL_R1_MIN_MS).toISOString();

  const { data: rows, error } = await svc
    .from('interviews')
    .select(
      'id, user_id, role, engine, status, credit_deducted, abandoned_resume_used, completed_at',
    )
    .eq('engine', 'v2.1')
    .eq('status', 'abandoned')
    .eq('credit_deducted', true)
    .eq('abandoned_resume_used', false)
    .not('completed_at', 'is', null)
    .gte('completed_at', oldestIso)
    .lte('completed_at', newestIso)
    .order('completed_at', { ascending: true })
    .limit(fetchLimit);

  if (error) {
    throw new Error(error.message);
  }

  const candidates = (rows ?? []).filter((row) =>
    isAbandonedContinueEligible({
      status: row.status,
      creditDeducted: row.credit_deducted,
      abandonedResumeUsed: row.abandoned_resume_used,
    }),
  );

  type InWindowRow = {
    row: (typeof candidates)[number];
    stage: RecoveryEmailStage;
    idempotencyKey: string;
  };
  const inWindow: InWindowRow[] = [];

  for (const stageCfg of RECOVERY_EMAIL_STAGES) {
    const stage = stageCfg.stage;
    for (const row of candidates) {
      const abandonedAtMs = Date.parse(row.completed_at ?? '');
      if (!Number.isFinite(abandonedAtMs)) continue;
      if (!isStageInWindow(abandonedAtMs, nowMs, stage)) continue;

      stats.considered += 1;
      stats.byStage[stage].considered += 1;

      if (dryRun || !sendsAllowed) {
        stats.skipped += 1;
        stats.byStage[stage].skipped += 1;
        bumpReason(stats, dryRun ? 'dry_run' : 'flag_disabled');
        continue;
      }

      inWindow.push({
        row,
        stage,
        idempotencyKey: recoveryEmailIdempotencyKey(row.id as string, stage),
      });
    }
  }

  if (inWindow.length === 0) {
    return stats;
  }

  const alreadySent = await prefetchSentLifecycleKeys(
    inWindow.map((item) => item.idempotencyKey),
    svc,
  );

  let sendAttempts = 0;
  for (const item of inWindow) {
    if (alreadySent.has(item.idempotencyKey)) {
      stats.skipped += 1;
      stats.byStage[item.stage].skipped += 1;
      bumpReason(stats, 'already_sent_or_claimed');
      continue;
    }

    if (sendAttempts >= sendBudget) {
      bumpReason(stats, 'batch_budget_exhausted');
      break;
    }

    sendAttempts += 1;
    stats.eligibleAttempted += 1;
    const result = await sendInterviewRecoveryEmailIfEligible({
      interviewId: item.row.id as string,
      stage: item.stage,
      nowMs,
    });

    if (result.sent) {
      stats.sent += 1;
      stats.byStage[item.stage].sent += 1;
    } else if (result.skipped) {
      stats.skipped += 1;
      stats.byStage[item.stage].skipped += 1;
      bumpReason(stats, result.reason ?? 'skipped');
    } else {
      stats.failed += 1;
      stats.byStage[item.stage].failed += 1;
      bumpReason(stats, `fail:${result.error ?? 'failed'}`);
    }
  }

  return stats;
}
