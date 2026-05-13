/**
 * Zod schemas for retention boundary validation.
 *
 * These run at the system boundary — payloads coming from API routes — and at
 * the trust boundary between the DB and the rest of the module. We re-validate
 * DB rows because Supabase JS returns `unknown`-flavored types (the project
 * does not generate types from the schema).
 */

import { z } from 'zod';
import { BADGE_KEYS, MIN_TIER, MAX_TIER } from './constants';

const tierNumberSchema = z
  .number()
  .int()
  .min(MIN_TIER)
  .max(MAX_TIER);

const scoreSchema = z.number().min(0).max(10);

export const dimensionScoresSchema = z.object({
  communication_clarity: scoreSchema,
  technical_depth: scoreSchema,
  answer_structure: scoreSchema,
  confidence: scoreSchema,
  relevance: scoreSchema,
});

export const checkAndUnlockTierInputSchema = z.object({
  userId: z.string().uuid(),
  sessionQuality: z
    .object({
      interviewId: z.string().uuid(),
      sessionScore: scoreSchema,
      maxDimensionScore: scoreSchema,
      dimensionScores: dimensionScoresSchema,
      qualityMet: z.boolean(),
    })
    .optional(),
  bypassCooldown: z.boolean().optional(),
});

export type CheckAndUnlockTierInputParsed = z.infer<typeof checkAndUnlockTierInputSchema>;

/** Validates the `badges_earned` JSONB blob shape. Defensive — DB CHECK can't enforce structure. */
export const badgeEntrySchema = z.object({
  badge: z.enum(BADGE_KEYS as unknown as [string, ...string[]]),
  earned_at: z.string().min(1),
  streak_length: z.number().int().min(0),
});

export const badgesEarnedSchema = z.array(badgeEntrySchema);

/**
 * Loose user_progress row schema — used to validate the shape of a row pulled
 * from Supabase. Lenient on nullable numerics because partially-initialized
 * rows are valid before the first quality session.
 */
export const userProgressRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  current_tier: tierNumberSchema,
  tier_unlocked_at: z.string(),
  total_sessions: z.number().int().min(0),
  sessions_at_current_tier: z.number().int().min(0),
  overall_avg_score: z.number().nullable(),
  max_dimension_score: z.number().nullable(),
  last_5_sessions_avg: z.number().nullable(),
  total_xp: z.number().int().min(0),
  current_streak: z.number().int().min(0),
  longest_streak: z.number().int().min(0),
  last_quality_session_date: z.string().nullable(),
  badges_earned: z.unknown(), // validate separately with badgesEarnedSchema when needed
  last_unlock_at: z.string().nullable(),
  last_check_at: z.string().nullable(),
  unlock_attempts: z.number().int().min(0),
  consecutive_rejections: z.number().int().min(0),
  flagged_suspicious: z.boolean(),
  flagged_reason: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const sessionQualityRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  interview_id: z.string().uuid(),
  questions_answered: z.number().int().min(0),
  total_questions: z.number().int().min(1),
  questions_skipped: z.number().int().min(0),
  avg_answer_duration_sec: z.number().int().min(0),
  session_score: scoreSchema,
  quality_met: z.boolean(),
  dimension_scores: z.unknown(),
  max_dimension_score: z.number().nullable(),
  unlock_contribution: z.unknown(),
  total_typing_ms: z.number().int().nullable(),
  total_speaking_ms: z.number().int().nullable(),
  tab_blur_count: z.number().int().nullable(),
  device_fingerprint: z.string().nullable(),
  ip_hash: z.string().nullable(),
  flagged_low_engagement: z.boolean(),
  flagged_duplicate_fingerprint: z.boolean(),
  flagged_impossible_speed: z.boolean(),
  flag_notes: z.string().nullable(),
  completed_at: z.string(),
});
