/**
 * Post-session reinforcement copy — no shaming on streak breaks.
 */

import { QUALITY_CRITERIA } from './constants';
import { formatProgressMessage } from './format-progress-message';
import type { UserProgressRow } from './types';
import { MAX_TIER } from './constants';

export type CompletionReinforcement = {
  xpEarned: number;
  streakLabel: string;
  nextUnlockTeaser: string | null;
  recoveryHint: string | null;
};

export function buildCompletionReinforcement(opts: {
  xpEarned: number;
  qualityMet: boolean;
  newStreak: number;
  previousStreak: number;
  currentTier: number;
  progressSlice: Pick<
    UserProgressRow,
    'total_sessions' | 'sessions_at_current_tier' | 'max_dimension_score' | 'last_5_sessions_avg' | 'overall_avg_score'
  >;
}): CompletionReinforcement {
  const { xpEarned, qualityMet, newStreak, previousStreak, currentTier, progressSlice } = opts;

  const nextUnlockTeaser =
    currentTier < MAX_TIER ? formatProgressMessage(currentTier, progressSlice) : null;

  const streakLabel = qualityMet
    ? newStreak > 0
      ? `Quality streak: ${newStreak} day${newStreak === 1 ? '' : 's'}`
      : 'Quality streak started'
    : 'Streak unchanged this session';

  let recoveryHint: string | null = null;
  if (!qualityMet) {
    recoveryHint =
      `This session did not count toward your streak yet (avg score ≥ ${QUALITY_CRITERIA.minSessionScore}, ` +
      `full completion, steady pacing). Your next full session can extend it — no reset penalty.`;
  } else if (previousStreak === 0 && newStreak === 1) {
    recoveryHint = 'Nice — your quality streak is active again. Keep completing full sessions.';
  }

  return { xpEarned, streakLabel, nextUnlockTeaser, recoveryHint };
}
