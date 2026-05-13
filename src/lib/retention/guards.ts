/**
 * Guards — pure decision functions used by checkAndUnlockTier.
 *
 * Three categories:
 *   1. Unlock criteria  — does the user qualify for the next tier?
 *   2. Cooldown         — has enough time passed since the last unlock?
 *   3. Anti-abuse       — does the progression look suspicious?
 *
 * All functions are pure: same inputs → same outputs, no I/O, no logging.
 */

import {
  TIERS,
  TIER_2_UNLOCK,
  TIER_3_UNLOCK,
  TIER_4_UNLOCK,
  UNLOCK_COOLDOWN_MS,
  MAX_CONSECUTIVE_REJECTIONS_BEFORE_FLAG,
  TIER_4_MIN_ACCOUNT_AGE_HOURS,
  type TierNumber,
} from './constants';
import type { ScoringSummary, UserProgressRow } from './types';

/** Returns the tier number a user at `currentTier` could possibly unlock next. */
export function nextTier(currentTier: number): TierNumber | null {
  if (currentTier === TIERS.FUNDAMENTALS) return TIERS.ADVANCED;
  if (currentTier === TIERS.ADVANCED) return TIERS.COMPANY_PATTERNS;
  if (currentTier === TIERS.COMPANY_PATTERNS) return TIERS.MOCK_PANEL;
  return null; // already at MAX or invalid
}

export interface CriteriaResult {
  qualifies: boolean;
  reason: string;
}

/** Decide whether a user qualifies for the next tier given a scoring summary. */
export function evaluateUnlockCriteria(
  currentTier: number,
  summary: ScoringSummary,
): CriteriaResult {
  switch (currentTier) {
    case TIERS.FUNDAMENTALS: {
      const sessionsOk = summary.totalSessions >= TIER_2_UNLOCK.minSessions;
      const dimOk =
        summary.maxDimensionScoreLifetime !== null &&
        summary.maxDimensionScoreLifetime >= TIER_2_UNLOCK.minDimensionScore;
      if (sessionsOk && dimOk) {
        return { qualifies: true, reason: TIER_2_UNLOCK.reason };
      }
      const missing: string[] = [];
      if (!sessionsOk) {
        missing.push(
          `need ${TIER_2_UNLOCK.minSessions - summary.totalSessions} more session(s)`,
        );
      }
      if (!dimOk) {
        const current = summary.maxDimensionScoreLifetime ?? 0;
        missing.push(
          `need ≥${TIER_2_UNLOCK.minDimensionScore} dimension score (best: ${current.toFixed(1)})`,
        );
      }
      return { qualifies: false, reason: missing.join('; ') };
    }

    case TIERS.ADVANCED: {
      const sessionsOk = summary.totalSessions >= TIER_3_UNLOCK.minSessions;
      const rollingOk =
        summary.last5Avg !== null && summary.last5Avg >= TIER_3_UNLOCK.minRollingAvg;
      if (sessionsOk && rollingOk) {
        return { qualifies: true, reason: TIER_3_UNLOCK.reason };
      }
      const missing: string[] = [];
      if (!sessionsOk) {
        missing.push(
          `need ${TIER_3_UNLOCK.minSessions - summary.totalSessions} more session(s)`,
        );
      }
      if (!rollingOk) {
        const current = summary.last5Avg ?? 0;
        missing.push(
          `need ≥${TIER_3_UNLOCK.minRollingAvg} avg over last ${TIER_3_UNLOCK.rollingWindow} (current: ${current.toFixed(1)})`,
        );
      }
      return { qualifies: false, reason: missing.join('; ') };
    }

    case TIERS.COMPANY_PATTERNS: {
      const sessionsOk = summary.totalSessions >= TIER_4_UNLOCK.minSessions;
      const overallOk =
        summary.overallAvg !== null && summary.overallAvg >= TIER_4_UNLOCK.minOverallAvg;
      if (sessionsOk && overallOk) {
        return { qualifies: true, reason: TIER_4_UNLOCK.reason };
      }
      const missing: string[] = [];
      if (!sessionsOk) {
        missing.push(
          `need ${TIER_4_UNLOCK.minSessions - summary.totalSessions} more session(s)`,
        );
      }
      if (!overallOk) {
        const current = summary.overallAvg ?? 0;
        missing.push(
          `need ≥${TIER_4_UNLOCK.minOverallAvg} overall avg (current: ${current.toFixed(1)})`,
        );
      }
      return { qualifies: false, reason: missing.join('; ') };
    }

    default:
      return { qualifies: false, reason: 'already_at_max_tier' };
  }
}

/** Cooldown: returns true when within window since last successful unlock. */
export function isWithinCooldown(progress: UserProgressRow, now: Date = new Date()): boolean {
  if (!progress.last_unlock_at) return false;
  const lastUnlockMs = Date.parse(progress.last_unlock_at);
  if (Number.isNaN(lastUnlockMs)) return false;
  return now.getTime() - lastUnlockMs < UNLOCK_COOLDOWN_MS;
}

export interface SuspicionAssessment {
  suspicious: boolean;
  reasons: string[];
}

/**
 * Heuristic anti-abuse check. Returns reasons rather than a single boolean so
 * the caller can persist them to user_progress.flagged_reason for review.
 *
 * Heuristics intentionally err on the side of *flagging* rather than
 * *rejecting* — most signals here are correlated with abuse but not definitive
 * (a real top-performer can hit thresholds fast). The caller decides whether
 * a flag also blocks the unlock.
 */
export function detectSuspiciousProgression(
  progress: UserProgressRow,
  toTier: TierNumber,
  now: Date = new Date(),
): SuspicionAssessment {
  const reasons: string[] = [];

  // 1. Account age vs. tier 4 unlock.
  if (toTier === TIERS.MOCK_PANEL) {
    const createdMs = Date.parse(progress.created_at);
    if (!Number.isNaN(createdMs)) {
      const ageHours = (now.getTime() - createdMs) / (1000 * 60 * 60);
      if (ageHours < TIER_4_MIN_ACCOUNT_AGE_HOURS) {
        reasons.push(
          `account_age_${ageHours.toFixed(1)}h_below_${TIER_4_MIN_ACCOUNT_AGE_HOURS}h_threshold`,
        );
      }
    }
  }

  // 2. Sustained spamming of the unlock endpoint.
  if (progress.consecutive_rejections >= MAX_CONSECUTIVE_REJECTIONS_BEFORE_FLAG) {
    reasons.push(`consecutive_rejections_${progress.consecutive_rejections}`);
  }

  // 3. Tier skipping (defensive — checkAndUnlockTier only ever unlocks +1, so this
  //    would only fire if a caller maliciously bypassed `nextTier`).
  if (toTier - progress.current_tier > 1) {
    reasons.push(`tier_skip_${progress.current_tier}_to_${toTier}`);
  }

  // 4. Impossibly few sessions for the target tier.
  if (toTier === TIERS.MOCK_PANEL && progress.total_sessions < TIER_4_UNLOCK.minSessions) {
    reasons.push(`tier_4_with_only_${progress.total_sessions}_sessions`);
  }

  return { suspicious: reasons.length > 0, reasons };
}
