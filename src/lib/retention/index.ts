/**
 * Public surface of the retention module.
 *
 * Internal callers (API routes, server actions) should import from here, not
 * from individual files, so the module's seam stays stable.
 *
 * Client Components (`'use client'`) must NOT import from this barrel — many
 * re-exports eventually load `@/lib/supabase/server` (`next/headers`). Prefer
 * shallow imports: `tier-copy`, `constants`, `format-progress-message`, etc.
 */

export { checkAndUnlockTier, checkAndUnlockTierForInterviewSession } from './tier-unlock';
export {
  TIERS,
  TIER_2_UNLOCK,
  TIER_3_UNLOCK,
  TIER_4_UNLOCK,
  QUALITY_CRITERIA,
  BADGE_THRESHOLDS,
  BADGE_KEYS,
  MAX_TIER,
  MIN_TIER,
  type TierNumber,
  type BadgeKey,
} from './constants';
export type {
  Badge,
  CheckAndUnlockTierInput,
  ScoringSummary,
  SessionData,
  SessionDataParsed,
  SessionQuality,
  SessionQualityRow,
  TierConfig,
  TierConfigParsed,
  TierPromptModifiers,
  TierUnlockCriteria,
  UnlockContribution,
  UnlockFailure,
  UnlockRejectReason,
  UnlockResult,
  UnlockSkipped,
  UnlockScoreType,
  UnlockSuccess,
  UserProgress,
  UserProgressRow,
  UserTierId,
  BadgeEntry,
} from './types';
export {
  sessionDataSchema,
  sessionQualityLogRowSchema,
  tierConfigRowSchema,
  tierIdSchema,
  tierPromptModifiersSchema,
  tierUnlockCriteriaSchema,
  userProgressSchema,
} from './types';
export { dimensionScoresSchema } from './validation';

export type { InterviewRetentionClientPayload } from './process-interview-complete';
export { processInterviewRetentionSafely } from './process-interview-complete';

export {
  checkBadgeUnlock,
  computeNewlyEarnedBadges,
  evaluateQuality,
  istCalendarDate,
  istYesterdayOf,
  streakSessionPayloadSchema,
  updateStreak,
} from './streak-tracker';
export type {
  CheckBadgeUnlockFailure,
  CheckBadgeUnlockResult,
  CheckBadgeUnlockSuccess,
  QualityVerdict,
  StreakSessionPayload,
  StreakAction,
  UpdateStreakFailure,
  UpdateStreakResult,
  UpdateStreakSuccess,
} from './streak-tracker';

export { formatProgressMessage } from './format-progress-message';

export {
  getTierConfig,
  getTierName,
  getUserProgress,
  mapSessionDataToStreakPayload,
  updateStreakFromInterviewSession,
} from './helpers';

export { getTierPublicLabel } from './tier-copy';
