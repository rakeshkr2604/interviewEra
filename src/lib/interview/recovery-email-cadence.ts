/**
 * Phase 2 recovery-email cadence (Hobby-safe daily UTC cron).
 *
 * Production sending remains gated by INTERVIEW_RECOVERY_EMAIL_ENABLED=1.
 * Anchor: interviews.completed_at while status=abandoned (terminal abandon time).
 *
 * Mutually exclusive stage windows (age = now − abandonedAt):
 * - [0, 24h): neither
 * - [24h, 72h): r1 only
 * - [72h, 7d]: r2 only (inclusive at 7d)
 * - (7d, ∞): neither
 *
 * Late first cron after 72h skips r1 (never sends both stages the same day).
 * Daily UTC jitter is accepted. Ambiguous dryRun query values force dry-run.
 */

export type RecoveryEmailStage = 'r1' | 'r2';

export const RECOVERY_EMAIL_R1_MIN_MS = 24 * 60 * 60 * 1000;
export const RECOVERY_EMAIL_R2_MIN_MS = 72 * 60 * 60 * 1000;
/** Inclusive upper bound for r2 (and overall campaign). */
export const RECOVERY_EMAIL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type RecoveryEmailStageConfig = {
  stage: RecoveryEmailStage;
  minAgeMs: number;
  /**
   * Exclusive upper bound for r1; inclusive max age for r2.
   * Interpreted by isStageInWindow — do not compare naively.
   */
  maxAgeMs: number;
};

export const RECOVERY_EMAIL_STAGES: readonly RecoveryEmailStageConfig[] = [
  {
    stage: 'r1',
    minAgeMs: RECOVERY_EMAIL_R1_MIN_MS,
    // Exclusive end: r1 stops at 72h (r2 starts).
    maxAgeMs: RECOVERY_EMAIL_R2_MIN_MS,
  },
  {
    stage: 'r2',
    minAgeMs: RECOVERY_EMAIL_R2_MIN_MS,
    maxAgeMs: RECOVERY_EMAIL_MAX_AGE_MS,
  },
] as const;

/** Max Resend/send attempts per cron run (excludes already-claimed skips). */
export const RECOVERY_EMAIL_BATCH_LIMIT = 40;

/**
 * Scan window size. Larger than BATCH so older already-claimed rows do not
 * starve newer eligible interviews under ORDER BY completed_at ASC.
 */
export const RECOVERY_EMAIL_FETCH_LIMIT = 200;

export function recoveryEmailIdempotencyKey(
  interviewId: string,
  stage: RecoveryEmailStage,
): string {
  return `interview_recovery:${interviewId}:${stage}`;
}

export function isInterviewRecoveryEmailEnabled(): boolean {
  return process.env.INTERVIEW_RECOVERY_EMAIL_ENABLED?.trim() === '1';
}

/**
 * Cron dry-run query parsing — fail closed on send.
 * - absent → false (may send only if flag on)
 * - any present value (including "1") → true
 */
export function parseRecoveryCronDryRunParam(raw: string | null): boolean {
  if (raw === null) return false;
  return true;
}

export function stageDueAt(abandonedAtMs: number, stage: RecoveryEmailStage): number {
  if (stage === 'r1') return abandonedAtMs + RECOVERY_EMAIL_R1_MIN_MS;
  if (stage === 'r2') return abandonedAtMs + RECOVERY_EMAIL_R2_MIN_MS;
  return Number.POSITIVE_INFINITY;
}

/**
 * Mutually exclusive windows.
 * r1: age ∈ [24h, 72h)
 * r2: age ∈ [72h, 7d]  (inclusive upper bound)
 */
export function isStageInWindow(
  abandonedAtMs: number,
  nowMs: number,
  stage: RecoveryEmailStage,
): boolean {
  const age = nowMs - abandonedAtMs;
  if (!Number.isFinite(age) || age < 0) return false;

  if (stage === 'r1') {
    return age >= RECOVERY_EMAIL_R1_MIN_MS && age < RECOVERY_EMAIL_R2_MIN_MS;
  }
  if (stage === 'r2') {
    return age >= RECOVERY_EMAIL_R2_MIN_MS && age <= RECOVERY_EMAIL_MAX_AGE_MS;
  }
  return false;
}

/** True when any recovery stage could still be due (for scan bounds). */
export function isWithinRecoveryCampaignWindow(
  abandonedAtMs: number,
  nowMs: number,
): boolean {
  const age = nowMs - abandonedAtMs;
  return (
    Number.isFinite(age) &&
    age >= RECOVERY_EMAIL_R1_MIN_MS &&
    age <= RECOVERY_EMAIL_MAX_AGE_MS
  );
}
