/**
 * Retention system constants — single source of truth for tier thresholds,
 * quality criteria, badge thresholds, cooldowns, and anti-abuse limits.
 *
 * Spec reference: hybrid-retention-system-spec.md §"Part 1" + §"Configuration".
 *
 * To re-tune in production: edit values here and redeploy. No DB schema changes
 * are required (tier rows are not stored in tier_config in this implementation
 * — they live here and travel with the app version that wrote them).
 */

export const TIERS = {
  FUNDAMENTALS: 1,
  ADVANCED: 2,
  COMPANY_PATTERNS: 3,
  MOCK_PANEL: 4,
} as const;

export type TierNumber = (typeof TIERS)[keyof typeof TIERS];

export const TIER_RANGE: readonly TierNumber[] = [1, 2, 3, 4];
export const MIN_TIER: TierNumber = 1;
export const MAX_TIER: TierNumber = 4;

/** Tier-2 unlock — from spec §Tier 2. */
export const TIER_2_UNLOCK = {
  fromTier: TIERS.FUNDAMENTALS,
  toTier: TIERS.ADVANCED,
  /** Minimum total sessions completed (any quality). */
  minSessions: 3,
  /** Minimum max-of-dimensions score in any single completed session. */
  minDimensionScore: 7.0,
  reason: 'tier_2_three_sessions_dim_score',
} as const;

/** Tier-3 unlock — from spec §Tier 3. */
export const TIER_3_UNLOCK = {
  fromTier: TIERS.ADVANCED,
  toTier: TIERS.COMPANY_PATTERNS,
  /** Rolling window size (most recent N sessions). */
  rollingWindow: 5,
  /** Minimum sessions before window can be evaluated. */
  minSessions: 5,
  /** Minimum mean session_score across the rolling window. */
  minRollingAvg: 7.5,
  reason: 'tier_3_rolling_avg_5',
} as const;

/** Tier-4 unlock — from spec §Tier 4. */
export const TIER_4_UNLOCK = {
  fromTier: TIERS.COMPANY_PATTERNS,
  toTier: TIERS.MOCK_PANEL,
  /** Minimum sessions before overall average is meaningful. */
  minSessions: 5,
  /** Minimum lifetime overall_avg_score. */
  minOverallAvg: 8.0,
  reason: 'tier_4_overall_avg',
} as const;

/** Quality criteria — ALL must be met for a session to count toward streaks/XP. */
export const QUALITY_CRITERIA = {
  minQuestionsAnswered: 5,
  /** Per-question average duration floor, in seconds. */
  minAvgDurationSec: 45,
  /** Per-session minimum score (NUMERIC scale 0–10). */
  minSessionScore: 6.0,
} as const;

/**
 * Minimum answered-count floor for quality, capped by session size so shorter
 * interviews (e.g. first-interview = 4 questions) can still qualify when fully completed.
 */
export function effectiveMinQuestionsAnswered(totalQuestions: number): number {
  const t = Math.max(1, Math.trunc(Number(totalQuestions)) || 0);
  return Math.min(QUALITY_CRITERIA.minQuestionsAnswered, t);
}

/** Badge tier thresholds — keys must match the `retention_badge` SQL enum. */
export const BADGE_THRESHOLDS = {
  consistent_learner: 3,
  dedicated_preparer: 7,
  interview_ready: 14,
  placement_warrior: 30,
} as const satisfies Record<string, number>;

export type BadgeKey = keyof typeof BADGE_THRESHOLDS;

export const BADGE_KEYS: readonly BadgeKey[] = [
  'consistent_learner',
  'dedicated_preparer',
  'interview_ready',
  'placement_warrior',
] as const;

/**
 * Cooldown between successful unlocks (per user). Prevents back-to-back unlocks
 * within seconds when a single high-scoring session crosses two thresholds at
 * once. We do NOT chain unlocks — caller can re-invoke after this window.
 */
export const UNLOCK_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Anti-abuse: max number of unlock-check invocations per user per hour. Above
 * this, we reject + flag. Real usage hits checkAndUnlockTier ≤ 1× per session
 * complete; sustained spam means a buggy client or scripted abuse.
 */
export const MAX_CHECKS_PER_HOUR = 30;

/**
 * Anti-abuse: max consecutive rejections before flagging. A user honestly
 * progressing rarely sees more than a handful in a row (each session = one
 * check). 20 in a row almost certainly means scripted retries.
 */
export const MAX_CONSECUTIVE_REJECTIONS_BEFORE_FLAG = 20;

/**
 * Anti-abuse: minimum gap from account creation before tier 4 can unlock.
 * Aimed at "fresh account → instant tier 4" via fabricated scores. 24h is
 * deliberately conservative; real users hitting 8.0 average in <24h are rare
 * but plausible — we flag rather than reject hard.
 */
export const TIER_4_MIN_ACCOUNT_AGE_HOURS = 24;

/** Floor used when we expect a numeric and the source is null/undefined. */
export const SCORE_FALLBACK = 0;
