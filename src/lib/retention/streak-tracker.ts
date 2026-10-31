/**
 * Quality streak + badge tracking.
 *
 * Spec reference: hybrid-retention-system-spec.md §"Part 2: Quality Streaks".
 *
 * Two public entry points:
 *   • updateStreak(userId, streakSessionPayload)
 *       Per-session streak mutation. Validates quality criteria, computes the
 *       new streak using IST calendar-day arithmetic, awards any newly-earned
 *       badges, and persists everything in a single UPDATE.
 *
 *   • checkBadgeUnlock(userId, streakCount)
 *       Standalone badge reconciliation. Reads current badges_earned, appends
 *       any badges whose threshold ≤ streakCount that the user does not yet
 *       hold, persists the merged list.
 *
 * Timezone: IST (UTC+5:30, no DST), per spec §"Questions to Resolve" — India
 * is the entire target audience and DATE columns are calendar-day-based.
 *
 * Concurrency: same-day duplicate processing is naturally absorbed because
 * `last_quality_session_date = today_IST` means "already counted today".
 * Cross-day races at the IST midnight boundary are extremely rare and not
 * worth a heavy lock; we accept eventual consistency there.
 *
 * Error handling: throws only on unrecoverable Supabase errors (caller treats
 * as 5xx). All "user input failed quality" / "already counted today" /
 * "no progress row" outcomes are returned as typed results.
 */

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from './logger';
import {
  BADGE_KEYS,
  BADGE_THRESHOLDS,
  QUALITY_CRITERIA,
  effectiveMinQuestionsAnswered,
  type BadgeKey,
} from './constants';
import type { BadgeEntry, UserProgressRow } from './types';

// ─── IST date helpers ───────────────────────────────────────────────────────

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Returns IST calendar date as "YYYY-MM-DD" — server-TZ-agnostic. */
export function istCalendarDate(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns the IST calendar date string for yesterday relative to `d`. */
export function istYesterdayOf(d: Date = new Date()): string {
  return istCalendarDate(new Date(d.getTime() - ONE_DAY_MS));
}

type DayRelation = 'first_ever' | 'same_day' | 'consecutive' | 'gap';

function classifyDayRelation(
  lastDate: string | null,
  today: string,
  yesterday: string,
): DayRelation {
  if (!lastDate) return 'first_ever';
  if (lastDate === today) return 'same_day';
  if (lastDate === yesterday) return 'consecutive';
  return 'gap';
}

// ─── Quality criteria ───────────────────────────────────────────────────────

/** Payload handed to streak `updateStreak` (interview-complete path). */
export const streakSessionPayloadSchema = z.object({
  interviewId: z.string().uuid(),
  questionsAnswered: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  avgAnswerDurationSec: z.number().min(0),
  sessionScore: z.number().min(0).max(10),
});

export type StreakSessionPayload = z.infer<typeof streakSessionPayloadSchema>;

export interface QualityVerdict {
  passed: boolean;
  /** Stable per-criterion booleans, useful for analytics and user-facing copy. */
  criteria: {
    allQuestionsAnswered: boolean;
    durationOk: boolean;
    scoreOk: boolean;
  };
  reasons: string[];
}

/**
 * Pure evaluator — same inputs always yield same verdict, no I/O.
 *
 * Spec §Quality Streaks: ALL of these must hold:
 *   1. questionsAnswered === totalQuestions (no skip)
 *   2. avgAnswerDurationSec ≥ 45
 *   3. sessionScore ≥ 6.0
 *
 * We also enforce `QUALITY_CRITERIA.minQuestionsAnswered` as a floor, capped
 * by session length via {@link effectiveMinQuestionsAnswered} so 4-question
 * sessions can qualify when fully completed.
 */
export function evaluateQuality(input: StreakSessionPayload): QualityVerdict {
  const minAnswered = effectiveMinQuestionsAnswered(input.totalQuestions);
  const allQuestionsAnswered =
    input.questionsAnswered === input.totalQuestions &&
    input.questionsAnswered >= minAnswered;
  const durationOk = input.avgAnswerDurationSec >= QUALITY_CRITERIA.minAvgDurationSec;
  const scoreOk = input.sessionScore >= QUALITY_CRITERIA.minSessionScore;

  const reasons: string[] = [];
  if (!allQuestionsAnswered) {
    reasons.push(
      `answered ${input.questionsAnswered}/${input.totalQuestions} (need all; min for quality ${minAnswered})`,
    );
  }
  if (!durationOk) {
    reasons.push(
      `avg duration ${input.avgAnswerDurationSec}s < ${QUALITY_CRITERIA.minAvgDurationSec}s`,
    );
  }
  if (!scoreOk) {
    reasons.push(`score ${input.sessionScore.toFixed(1)} < ${QUALITY_CRITERIA.minSessionScore}`);
  }

  return {
    passed: allQuestionsAnswered && durationOk && scoreOk,
    criteria: { allQuestionsAnswered, durationOk, scoreOk },
    reasons,
  };
}

// ─── Badge computation ──────────────────────────────────────────────────────

/**
 * Pure: given a streak length and the user's existing badge list, returns the
 * badges newly earned at this streak count. Uses `≥ threshold` (not `=`) so
 * any data-migration / admin-set scenario that skips thresholds still grants
 * the missed badges retroactively.
 */
export function computeNewlyEarnedBadges(
  streakCount: number,
  existing: readonly BadgeEntry[],
): BadgeKey[] {
  const have = new Set<BadgeKey>(existing.map((e) => e.badge));
  const out: BadgeKey[] = [];
  for (const key of BADGE_KEYS) {
    if (streakCount >= BADGE_THRESHOLDS[key] && !have.has(key)) {
      out.push(key);
    }
  }
  return out;
}

function parseBadgesJSON(raw: unknown): BadgeEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: BadgeEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const badge = typeof o.badge === 'string' ? o.badge : '';
    const earnedAt = typeof o.earned_at === 'string' ? o.earned_at : '';
    const streakLen = typeof o.streak_length === 'number' ? o.streak_length : 0;
    if (
      BADGE_KEYS.includes(badge as BadgeKey) &&
      earnedAt.length > 0 &&
      Number.isFinite(streakLen)
    ) {
      out.push({ badge: badge as BadgeKey, earned_at: earnedAt, streak_length: streakLen });
    }
  }
  return out;
}

// ─── Public result shapes ───────────────────────────────────────────────────

export type StreakAction =
  | 'started_fresh'           // first ever quality session
  | 'incremented'             // continued from yesterday
  | 'restarted_after_gap'     // had a streak, broke it, starts new at 1
  | 'same_day_noop'           // already had a quality session today
  | 'not_counted';            // no answered question — streak unchanged

export interface UpdateStreakSuccess {
  ok: true;
  qualityMet: boolean;
  qualityReasons: string[];
  previousStreak: number;
  newStreak: number;
  longestStreak: number;
  streakAction: StreakAction;
  newlyEarnedBadges: BadgeKey[];
  lastQualitySessionDate: string | null; // IST YYYY-MM-DD
}

export interface UpdateStreakFailure {
  ok: false;
  reasonCode: 'invalid_input' | 'no_user_progress_row' | 'database_error';
  message: string;
}

export type UpdateStreakResult = UpdateStreakSuccess | UpdateStreakFailure;

export interface CheckBadgeUnlockSuccess {
  ok: true;
  streakCount: number;
  newlyEarnedBadges: BadgeKey[];
  allBadges: BadgeEntry[];
}

export interface CheckBadgeUnlockFailure {
  ok: false;
  reasonCode: 'invalid_input' | 'no_user_progress_row' | 'database_error';
  message: string;
}

export type CheckBadgeUnlockResult = CheckBadgeUnlockSuccess | CheckBadgeUnlockFailure;

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function loadProgress(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProgressRow | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('streak_progress_load_failed', { userId, error: error.message });
    throw new Error(`user_progress load failed: ${error.message}`);
  }
  return (data as UserProgressRow | null) ?? null;
}

// ─── Public: updateStreak ───────────────────────────────────────────────────

/**
 * Evaluate quality on the supplied session, advance/reset the streak according
 * to spec rules, and persist. Idempotent for the same calendar day.
 *
 * The function only touches streak-related columns of user_progress
 * (current_streak, longest_streak, last_quality_session_date, badges_earned).
 * It does NOT write to session_quality_log — that's the caller's job.
 */
export async function updateStreak(
  userId: string,
  sessionData: StreakSessionPayload,
  options: { now?: Date } = {},
): Promise<UpdateStreakResult> {
  // 1. Input validation.
  const userIdParse = z.string().uuid().safeParse(userId);
  if (!userIdParse.success) {
    return {
      ok: false,
      reasonCode: 'invalid_input',
      message: 'userId must be a UUID',
    };
  }

  const sessionParse = streakSessionPayloadSchema.safeParse(sessionData);
  if (!sessionParse.success) {
    logger.warn('streak_input_invalid', { issues: sessionParse.error.issues });
    return {
      ok: false,
      reasonCode: 'invalid_input',
      message: sessionParse.error.issues.map((i) => i.message).join('; '),
    };
  }

  const now = options.now ?? new Date();
  const today = istCalendarDate(now);
  const yesterday = istYesterdayOf(now);

  const supabase = createServiceClient();

  // 2. Load current state.
  let progress: UserProgressRow | null;
  try {
    progress = await loadProgress(supabase, userIdParse.data);
  } catch (err) {
    return {
      ok: false,
      reasonCode: 'database_error',
      message: err instanceof Error ? err.message : 'unknown DB error',
    };
  }

  if (!progress) {
    logger.error('streak_no_progress_row', { userId });
    return {
      ok: false,
      reasonCode: 'no_user_progress_row',
      message: 'user_progress row missing — bootstrap trigger should have created it',
    };
  }

  // 3. Evaluate quality and decide the new streak length.
  const quality = evaluateQuality(sessionParse.data);
  const previousStreak = progress.current_streak ?? 0;
  const previousBadges = parseBadgesJSON(progress.badges_earned);
  const lastDate = progress.last_quality_session_date;

  let newStreak = previousStreak;
  let streakAction: StreakAction;
  let newLastDate: string | null = lastDate;

  // Streak = a day with at least one completed interview. Skips, low scores or
  // short answers still count; quality only gates XP/tiers, never the streak.
  const countsForStreak = sessionParse.data.questionsAnswered >= 1;

  if (!countsForStreak) {
    streakAction = 'not_counted';
  } else {
    const relation = classifyDayRelation(lastDate, today, yesterday);
    switch (relation) {
      case 'first_ever':
        newStreak = 1;
        streakAction = 'started_fresh';
        newLastDate = today;
        break;
      case 'consecutive':
        newStreak = previousStreak + 1;
        streakAction = 'incremented';
        newLastDate = today;
        break;
      case 'same_day':
        if (previousStreak === 0) {
          // last_quality_session_date is today but streak is 0, meaning the
          // earlier session today was an old-code quality-fail reset. Let this
          // valid session start the streak fresh rather than staying stuck at 0.
          newStreak = 1;
          streakAction = 'restarted_after_gap';
          newLastDate = today;
        } else {
          // Already got streak credit today — no change, no badge re-award.
          streakAction = 'same_day_noop';
        }
        break;
      case 'gap':
        newStreak = 1;
        streakAction = 'restarted_after_gap';
        newLastDate = today;
        break;
    }
  }

  // 4. Compute badges newly earned by the new streak length.
  const newBadgeKeys =
    streakAction === 'same_day_noop' || streakAction === 'not_counted'
      ? []
      : computeNewlyEarnedBadges(newStreak, previousBadges);

  const mergedBadges: BadgeEntry[] = [...previousBadges];
  const earnedAtISO = now.toISOString();
  for (const key of newBadgeKeys) {
    mergedBadges.push({
      badge: key,
      earned_at: earnedAtISO,
      streak_length: newStreak,
    });
  }

  const longestStreak = Math.max(progress.longest_streak ?? 0, newStreak);

  // 5. Persist. Same-day no-op skips the write to avoid bumping updated_at unnecessarily.
  if (streakAction === 'same_day_noop' || streakAction === 'not_counted') {
    logger.info('streak_same_day_noop', {
      userId,
      currentStreak: previousStreak,
      lastQualitySessionDate: lastDate,
    });
    return {
      ok: true,
      qualityMet: quality.passed,
      qualityReasons: quality.reasons,
      previousStreak,
      newStreak: previousStreak,
      longestStreak,
      streakAction,
      newlyEarnedBadges: [],
      lastQualitySessionDate: lastDate,
    };
  }

  const { error: updateErr } = await supabase
    .from('user_progress')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_quality_session_date: newLastDate,
      badges_earned: mergedBadges,
    })
    .eq('user_id', userIdParse.data);

  if (updateErr) {
    logger.error('streak_update_failed', { userId, error: updateErr.message });
    return {
      ok: false,
      reasonCode: 'database_error',
      message: updateErr.message,
    };
  }

  // 6. Log + return.
  logger.info('streak_updated', {
    userId,
    qualityMet: quality.passed,
    previousStreak,
    newStreak,
    streakAction,
    newlyEarnedBadges: newBadgeKeys,
    lastQualitySessionDate: newLastDate,
  });

  return {
    ok: true,
    qualityMet: quality.passed,
    qualityReasons: quality.reasons,
    previousStreak,
    newStreak,
    longestStreak,
    streakAction,
    newlyEarnedBadges: newBadgeKeys,
    lastQualitySessionDate: newLastDate,
  };
}

// ─── Public: checkBadgeUnlock ───────────────────────────────────────────────

/**
 * Standalone badge reconciliation. Awards any badges whose threshold ≤
 * streakCount that the user doesn't already hold. Safe to call from outside
 * the session-complete flow (e.g., admin grant, backfill job, manual replay).
 *
 * Idempotent: re-running with the same streakCount returns an empty
 * newlyEarnedBadges array on the second call.
 */
export async function checkBadgeUnlock(
  userId: string,
  streakCount: number,
  options: { now?: Date } = {},
): Promise<CheckBadgeUnlockResult> {
  const userIdParse = z.string().uuid().safeParse(userId);
  if (!userIdParse.success) {
    return { ok: false, reasonCode: 'invalid_input', message: 'userId must be a UUID' };
  }
  const countParse = z.number().int().min(0).safeParse(streakCount);
  if (!countParse.success) {
    return {
      ok: false,
      reasonCode: 'invalid_input',
      message: 'streakCount must be a non-negative integer',
    };
  }

  const supabase = createServiceClient();

  let progress: UserProgressRow | null;
  try {
    progress = await loadProgress(supabase, userIdParse.data);
  } catch (err) {
    return {
      ok: false,
      reasonCode: 'database_error',
      message: err instanceof Error ? err.message : 'unknown DB error',
    };
  }
  if (!progress) {
    return {
      ok: false,
      reasonCode: 'no_user_progress_row',
      message: 'user_progress row missing',
    };
  }

  const existing = parseBadgesJSON(progress.badges_earned);
  const newKeys = computeNewlyEarnedBadges(countParse.data, existing);

  if (newKeys.length === 0) {
    return {
      ok: true,
      streakCount: countParse.data,
      newlyEarnedBadges: [],
      allBadges: existing,
    };
  }

  const earnedAtISO = (options.now ?? new Date()).toISOString();
  const merged: BadgeEntry[] = [
    ...existing,
    ...newKeys.map((badge) => ({
      badge,
      earned_at: earnedAtISO,
      streak_length: countParse.data,
    })),
  ];

  const { error } = await supabase
    .from('user_progress')
    .update({ badges_earned: merged })
    .eq('user_id', userIdParse.data);

  if (error) {
    logger.error('badge_unlock_persist_failed', { userId, error: error.message });
    return { ok: false, reasonCode: 'database_error', message: error.message };
  }

  logger.info('badge_unlock_success', {
    userId,
    streakCount: countParse.data,
    newlyEarnedBadges: newKeys,
  });

  return {
    ok: true,
    streakCount: countParse.data,
    newlyEarnedBadges: newKeys,
    allBadges: merged,
  };
}
