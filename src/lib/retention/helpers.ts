/**
 * Retention helpers — Supabase reads, copy helpers, streak mapping.
 *
 * Uses `createClient()` from `@/lib/supabase/server` (cookie-aware SSR). Browser
 * code should import `createClient` from `@/lib/supabase/client` instead when
 * running strictly on the client.
 */

import { createClient } from '@/lib/supabase/server';
import { MAX_TIER } from './constants';
import { logger } from './logger';
import { updateStreak } from './streak-tracker';
import type { StreakSessionPayload, UpdateStreakResult } from './streak-tracker';
import type { SessionData, TierConfig, UserProgressRow } from './types';
import { tierConfigRowSchema, userProgressSchema } from './types';

export function mapSessionDataToStreakPayload(session: SessionData): StreakSessionPayload {
  return {
    interviewId: session.interviewId,
    questionsAnswered: session.questionsAnswered,
    totalQuestions: session.totalQuestions,
    avgAnswerDurationSec: session.avgAnswerDuration,
    sessionScore: session.overallScore,
  };
}

/** Maps rich interview payloads into the streak quality pipeline (`updateStreak`). */
export async function updateStreakFromInterviewSession(
  userId: string,
  session: SessionData,
  options?: { now?: Date },
): Promise<UpdateStreakResult> {
  return updateStreak(userId, mapSessionDataToStreakPayload(session), options);
}

/** Loads `public.user_progress` for `userId` inside the authenticated server context. */
export async function getUserProgress(userId: string): Promise<UserProgressRow | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('helper_get_user_progress_failed', {
        userId,
        message: error.message,
        code: error.code,
      });
      return null;
    }
    if (!data) return null;

    const parsed = userProgressSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn('helper_user_progress_shape_drift', {
        userId,
        issues: parsed.error.issues,
      });
      return data as unknown as UserProgressRow;
    }
    return parsed.data as unknown as UserProgressRow;
  } catch (err) {
    logger.error('helper_get_user_progress_exception', {
      userId,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return null;
  }
}

/** Reads `public.tier_config`; returns null if the relation is absent (older DB forks). */
export async function getTierConfig(tierId: number): Promise<TierConfig | null> {
  const bounded = Math.min(MAX_TIER, Math.max(1, Math.round(tierId)));
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tier_config')
      .select('*')
      .eq('tier_id', bounded)
      .maybeSingle();

    if (error) {
      /** `42P01`: Postgres undefined_table; `PGRST205`: table not exposed / absent from REST schema cache */
      const missingRelation =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.toLowerCase().includes('does not exist');
      if (missingRelation) {
        logger.warn('helper_tier_config_unavailable', { tierId: bounded, code: error.code });
        return null;
      }
      logger.error('helper_get_tier_config_failed', {
        tierId: bounded,
        message: error.message,
        code: error.code,
      });
      return null;
    }
    if (!data) return null;

    const parsed = tierConfigRowSchema.safeParse(data);
    if (!parsed.success) {
      logger.warn('helper_tier_config_shape_drift', {
        tierId: bounded,
        issues: parsed.error.issues,
      });
      return data as unknown as TierConfig;
    }
    return parsed.data as unknown as TierConfig;
  } catch (err) {
    logger.error('helper_get_tier_config_exception', {
      tierId: bounded,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return null;
  }
}

export async function getTierName(tierId: number): Promise<string> {
  const bounded = Math.min(MAX_TIER, Math.max(1, Math.round(tierId)));
  const cfg = await getTierConfig(bounded);
  if (cfg?.tier_name) return cfg.tier_name;
  return `Tier ${bounded}`;
}
