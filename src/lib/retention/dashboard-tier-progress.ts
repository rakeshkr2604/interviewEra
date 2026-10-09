/**
 * Pure dashboard projections for next-tier progress (server or client).
 * Criteria default from `tier_config` when present; fall back to Phase-1 constants.
 * Session counts for dashboard gates use `user_progress.total_sessions`
 * (completed interviews). Unlock RPC may still evaluate last-N quality logs —
 * copy labels say “sessions” / “overall avg” to match stored rollups shown here.
 */

import { MAX_TIER, TIER_2_UNLOCK, TIER_3_UNLOCK, TIER_4_UNLOCK } from './constants';
import { formatProgressMessage } from './format-progress-message';
import type { TierConfig, UserProgressRow } from './types';

export type RetentionTierProgressPick = Pick<
  UserProgressRow,
  | 'current_tier'
  | 'total_sessions'
  | 'sessions_at_current_tier'
  | 'max_dimension_score'
  | 'last_5_sessions_avg'
  | 'overall_avg_score'
>;

export interface RetentionTierProgressView {
  targetTierNumber: number;
  tierDisplayName: string;
  tierDescription: string | null;
  /** 0–100: bottleneck of session vs score pillars (both must clear to unlock). */
  progressPercent: number;
  sessionsProgressLabel: string;
  scoreProgressLabel: string;
  /** Paragraph aligned with {@link formatProgressMessage}. */
  nextUnlockHint: string;
}

function defaultTierName(targetTierNumber: number): string {
  switch (targetTierNumber) {
    case 2:
      return 'Advanced Questions';
    case 3:
      return 'Company Patterns';
    case 4:
      return 'Mock Panel Mode';
    default:
      return `Tier ${targetTierNumber}`;
  }
}

function resolveGate(
  targetTierNumber: number,
  cfg: TierConfig | null,
): {
  sessionsRequired: number;
  minScore: number;
  scoreType: 'any_dimension' | 'rolling_average' | 'overall_average';
} {
  const c = cfg?.unlock_criteria;
  if (targetTierNumber === 2) {
    return {
      sessionsRequired: Math.max(1, c?.sessions_required ?? TIER_2_UNLOCK.minSessions),
      minScore: c?.min_score ?? TIER_2_UNLOCK.minDimensionScore,
      scoreType: c?.score_type ?? 'any_dimension',
    };
  }
  if (targetTierNumber === 3) {
    return {
      sessionsRequired: Math.max(1, c?.sessions_required ?? TIER_3_UNLOCK.minSessions),
      minScore: c?.min_score ?? TIER_3_UNLOCK.minRollingAvg,
      scoreType: c?.score_type ?? 'rolling_average',
    };
  }
  if (targetTierNumber === 4) {
    const sessions =
      c?.sessions_required != null && Number.isFinite(c.sessions_required)
        ? Math.max(1, c.sessions_required)
        : TIER_4_UNLOCK.minSessions;
    return {
      sessionsRequired: sessions,
      minScore: c?.min_score ?? TIER_4_UNLOCK.minOverallAvg,
      scoreType: c?.score_type ?? 'overall_average',
    };
  }
  return {
    sessionsRequired: 1,
    minScore: 0,
    scoreType: 'overall_average',
  };
}

export function computeRetentionTierProgressView(
  progress: RetentionTierProgressPick,
  nextTierConfig: TierConfig | null,
): RetentionTierProgressView | null {
  const tier = Math.min(MAX_TIER, Math.max(1, Math.round(Number(progress.current_tier) || 1)));
  if (tier >= MAX_TIER) return null;

  const targetTierNumber = tier + 1;
  const gate = resolveGate(targetTierNumber, nextTierConfig);

  const totalSessions = Math.max(0, progress.total_sessions ?? 0);
  const maxDim = progress.max_dimension_score ?? null;
  const last5 = progress.last_5_sessions_avg ?? null;
  const overall = progress.overall_avg_score ?? null;

  let scoreCurrent: number | null = null;
  let scoreLabelSuffix: string;

  switch (gate.scoreType) {
    case 'any_dimension':
      scoreCurrent = maxDim;
      scoreLabelSuffix = ' best dimension';
      break;
    case 'rolling_average':
      scoreCurrent = last5;
      scoreLabelSuffix = ` avg (last ${TIER_3_UNLOCK.rollingWindow})`;
      break;
    default:
      scoreCurrent = overall;
      scoreLabelSuffix = ' overall avg';
  }

  const sessPct = Math.min(100, (totalSessions / gate.sessionsRequired) * 100);
  const scoreDenom = gate.minScore > 0 ? gate.minScore : 1;
  const scorePct =
    scoreCurrent === null || !Number.isFinite(scoreCurrent)
      ? 0
      : Math.min(100, (scoreCurrent / scoreDenom) * 100);
  const progressPercent = Math.max(0, Math.min(100, Math.round(Math.min(sessPct, scorePct))));

  const sessionsProgressLabel = `${Math.min(totalSessions, gate.sessionsRequired)} / ${gate.sessionsRequired} sessions`;

  const scoreDisplay =
    scoreCurrent === null || !Number.isFinite(scoreCurrent) ? '—' : scoreCurrent.toFixed(1);
  const scoreProgressLabel = `${scoreDisplay} / ${gate.minScore.toFixed(1)}${scoreLabelSuffix}`;

  const tierDisplayName = nextTierConfig?.tier_name?.trim() || defaultTierName(targetTierNumber);
  const tierDescription =
    typeof nextTierConfig?.description === 'string' && nextTierConfig.description.trim()
      ? nextTierConfig.description.trim()
      : null;

  return {
    targetTierNumber,
    tierDisplayName,
    tierDescription,
    progressPercent,
    sessionsProgressLabel,
    scoreProgressLabel,
    nextUnlockHint: formatProgressMessage(tier, progress),
  };
}
