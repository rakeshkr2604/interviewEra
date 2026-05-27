import type { InterviewRetentionClientPayload } from './process-interview-complete';

/**
 * Shape of the nested `retention` object on POST /api/interview/complete
 * when the retention pipeline produces a payload.
 */
export type InterviewCompleteRetentionPayload = InterviewRetentionClientPayload & {
  streakCount: number;
  badgeEarned: string | null;
  progress: string | null;
  nextTierNumber: number | null;
  nextTierProgressPercent: number;
  xpEarned?: number;
  nextUnlockTeaser?: string | null;
  streakLabel?: string;
  recoveryHint?: string | null;
};
