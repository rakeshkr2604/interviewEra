/**
 * Pure tier progress copy — safe for Client Components (no `next/headers`).
 */

import {
  MAX_TIER,
  TIER_2_UNLOCK,
  TIER_3_UNLOCK,
  TIER_4_UNLOCK,
} from './constants';
import type { UserProgressRow } from './types';

/** Visual fill (0–100) toward the next tier; aligns loosely with {@link formatProgressMessage}. */
export function computeNextTierProgressPercent(
  currentTier: number,
  progress: Pick<
    UserProgressRow,
    | 'total_sessions'
    | 'sessions_at_current_tier'
    | 'max_dimension_score'
    | 'last_5_sessions_avg'
    | 'overall_avg_score'
  >,
): { nextTierNumber: number | null; percentTowardNext: number } {
  const tier = Math.min(MAX_TIER, Math.max(1, Math.round(currentTier)));
  if (tier >= MAX_TIER) {
    return { nextTierNumber: null, percentTowardNext: 100 };
  }

  const nextTierNumber = tier + 1;
  const totalSessions = progress.total_sessions ?? 0;
  const sessionsAtTier = progress.sessions_at_current_tier ?? 0;
  const maxDim = progress.max_dimension_score ?? null;
  const last5 = progress.last_5_sessions_avg ?? null;
  const overall = progress.overall_avg_score ?? null;

  if (nextTierNumber === 2) {
    const sessionsRatio = Math.min(1, totalSessions / TIER_2_UNLOCK.minSessions);
    const dimRatio =
      maxDim === null ? 0 : Math.min(1, maxDim / TIER_2_UNLOCK.minDimensionScore);
    const pct = Math.round(((sessionsRatio + dimRatio) / 2) * 100);
    return { nextTierNumber, percentTowardNext: pct };
  }

  if (nextTierNumber === 3) {
    const sessionsRatio = Math.min(1, sessionsAtTier / TIER_3_UNLOCK.minSessions);
    const rollingRatio =
      last5 === null ? 0 : Math.min(1, last5 / TIER_3_UNLOCK.minRollingAvg);
    const pct = Math.round(((sessionsRatio + rollingRatio) / 2) * 100);
    return { nextTierNumber, percentTowardNext: pct };
  }

  const sessionsRatio = Math.min(1, totalSessions / TIER_4_UNLOCK.minSessions);
  const overallRatio =
    overall === null ? 0 : Math.min(1, overall / TIER_4_UNLOCK.minOverallAvg);
  const pct = Math.round(((sessionsRatio + overallRatio) / 2) * 100);
  return { nextTierNumber, percentTowardNext: pct };
}

/** Human-readable “distance to next tier” copy anchored to Phase-1 thresholds. */
export function formatProgressMessage(
  currentTier: number,
  progress: Pick<
    UserProgressRow,
    | 'total_sessions'
    | 'sessions_at_current_tier'
    | 'max_dimension_score'
    | 'last_5_sessions_avg'
    | 'overall_avg_score'
  >,
): string {
  const tier = Math.min(MAX_TIER, Math.max(1, Math.round(currentTier)));
  const nextTier = tier + 1;

  if (nextTier > MAX_TIER) {
    return 'You have reached the maximum tier.';
  }

  const totalSessions = progress.total_sessions ?? 0;
  const sessionsAtTier = progress.sessions_at_current_tier ?? 0;
  const maxDim = progress.max_dimension_score ?? null;
  const last5 = progress.last_5_sessions_avg ?? null;
  const overall = progress.overall_avg_score ?? null;

  if (nextTier === 2) {
    const sessionsNeeded = Math.max(0, TIER_2_UNLOCK.minSessions - totalSessions);
    const scoreFloor = TIER_2_UNLOCK.minDimensionScore;
    const scoreGap = maxDim === null ? scoreFloor : Math.max(0, scoreFloor - maxDim);

    if (sessionsNeeded > 0) {
      return `Complete ${sessionsNeeded} more session${sessionsNeeded > 1 ? 's' : ''} (${TIER_2_UNLOCK.minSessions} minimum) toward Advanced Questions.`;
    }
    if (scoreGap > 0) {
      return `Reach at least ${scoreFloor.toFixed(1)} on any dimension (${scoreGap.toFixed(1)} to go).`;
    }
  } else if (nextTier === 3) {
    const sessionsNeeded = Math.max(0, TIER_3_UNLOCK.minSessions - sessionsAtTier);
    const target = TIER_3_UNLOCK.minRollingAvg;
    const gap = last5 === null ? target : Math.max(0, target - last5);

    if (sessionsNeeded > 0) {
      return `Complete ${sessionsNeeded} more session${sessionsNeeded > 1 ? 's' : ''} at this tier (${TIER_3_UNLOCK.minSessions}-session rolling window).`;
    }
    if (gap > 0) {
      return `Raise your last-${TIER_3_UNLOCK.rollingWindow} average to ${target.toFixed(1)} (${gap.toFixed(1)} to go).`;
    }
  } else if (nextTier === 4) {
    const target = TIER_4_UNLOCK.minOverallAvg;
    const gap = overall === null ? target : Math.max(0, target - overall);

    if (overall === null || gap > 0) {
      return `Reach a ${target.toFixed(1)} overall lifetime average (${gap.toFixed(1)} points to go).`;
    }
  }

  return 'Keep practicing — the next tier unlocks after documented quality thresholds.';
}
