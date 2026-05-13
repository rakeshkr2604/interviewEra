/**
 * Retention system types — DB row shapes, function inputs, function outputs.
 *
 * DB-row types mirror the columns in 015_retention_system.sql. Keep them in
 * sync with the migration; the Supabase JS client is untyped at this layer.
 */

import type { DimensionScores } from '@/types/app.types';
import type { TierNumber, BadgeKey } from './constants';
import { MIN_TIER, MAX_TIER } from './constants';
import {
  dimensionScoresSchema,
  sessionQualityRowSchema,
  userProgressRowSchema,
} from './validation';
import { z } from 'zod';

// ─── DB row shapes ──────────────────────────────────────────────────────────

/** JSONB shape stored in user_progress.badges_earned. */
export interface BadgeEntry {
  badge: BadgeKey;
  earned_at: string; // ISO timestamp
  streak_length: number;
}

/** JSONB shape stored in session_quality_log.unlock_contribution. */
export interface UnlockContribution {
  tier_unlocked: TierNumber | null;
  streak_delta: number;
  badge_earned: BadgeKey | null;
  xp_gained: number;
}

/** Mirrors public.user_progress (camelCase TS, snake_case in DB). */
export interface UserProgressRow {
  id: string;
  user_id: string;
  current_tier: number;
  tier_unlocked_at: string;
  total_sessions: number;
  sessions_at_current_tier: number;
  overall_avg_score: number | null;
  max_dimension_score: number | null;
  last_5_sessions_avg: number | null;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_quality_session_date: string | null;
  badges_earned: BadgeEntry[];
  last_unlock_at: string | null;
  last_check_at: string | null;
  unlock_attempts: number;
  consecutive_rejections: number;
  flagged_suspicious: boolean;
  flagged_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Mirrors public.session_quality_log. */
export interface SessionQualityRow {
  id: string;
  user_id: string;
  interview_id: string;
  questions_answered: number;
  total_questions: number;
  questions_skipped: number;
  avg_answer_duration_sec: number;
  session_score: number;
  quality_met: boolean;
  dimension_scores: DimensionScores | Record<string, number>;
  max_dimension_score: number | null;
  unlock_contribution: UnlockContribution | Record<string, never>;
  total_typing_ms: number | null;
  total_speaking_ms: number | null;
  tab_blur_count: number | null;
  device_fingerprint: string | null;
  ip_hash: string | null;
  flagged_low_engagement: boolean;
  flagged_duplicate_fingerprint: boolean;
  flagged_impossible_speed: boolean;
  flag_notes: string | null;
  completed_at: string;
}

// ─── Function I/O ───────────────────────────────────────────────────────────

/**
 * Public input to checkAndUnlockTier. The caller (interview-complete API
 * route) constructs this from the just-finished interview's evaluations.
 *
 * NOTE on `sessionQuality`: this is OPTIONAL. If provided, we trust the caller
 * to have written the matching row to session_quality_log. If omitted, we pull
 * the latest log row from the DB. The optional path exists so the
 * interview-complete handler can compute once and not pay a round-trip.
 */
export interface CheckAndUnlockTierInput {
  userId: string;
  /** Optional fresh session payload. If absent we'll read DB state. */
  sessionQuality?: {
    interviewId: string;
    sessionScore: number;
    maxDimensionScore: number;
    dimensionScores: DimensionScores;
    qualityMet: boolean;
  };
  /**
   * Optional bypass for cooldown enforcement (e.g., admin manual unlock).
   * Treat with care — only set true from trusted backends.
   */
  bypassCooldown?: boolean;
}

export type UnlockRejectReason =
  | 'already_at_max_tier'
  | 'criteria_not_met'
  | 'cooldown_active'
  | 'rate_limit_exceeded'
  | 'suspicious_progression'
  | 'no_user_progress_row'
  | 'race_lost'
  | 'invalid_input'
  | 'database_error';

export interface UnlockSuccess {
  ok: true;
  unlocked: true;
  previousTier: TierNumber;
  newTier: TierNumber;
  unlockedAt: string;
  reasonCode: string;
}

export interface UnlockSkipped {
  ok: true;
  unlocked: false;
  currentTier: TierNumber;
  reasonCode: UnlockRejectReason | 'no_progress_made';
  /** Human-readable for logs/UI. */
  message: string;
  /** Optional diagnostic numbers — what we evaluated against. */
  diagnostics?: {
    totalSessions?: number;
    overallAvg?: number | null;
    last5Avg?: number | null;
    maxDimensionScore?: number | null;
  };
}

export interface UnlockFailure {
  ok: false;
  unlocked: false;
  reasonCode: UnlockRejectReason;
  message: string;
}

export type UnlockResult = UnlockSuccess | UnlockSkipped | UnlockFailure;

/** Aggregated scoring summary used by guards + scoring.ts. */
export interface ScoringSummary {
  totalSessions: number;
  overallAvg: number | null;
  last5Avg: number | null;
  maxDimensionScoreLifetime: number | null;
}

// ─── PRD / cross-table payloads (readable names on top of SQL column names) ──

/** Tier PK used by `tier_config.tier_id` and constrained `current_tier`. */
export type UserTierId = 1 | 2 | 3 | 4;

/**
 * `public.user_progress` — PostgreSQL-aligned; `current_tier` narrowed for
 * exhaustive UI switches.
 *
 * Mirrors {@link UserProgressRow}; duplicate kept so PRD-aligned modules can import
 * `UserProgress` without coupling to legacy `Row` suffix naming.
 */
export interface UserProgress extends UserProgressRow {
  current_tier: UserTierId;
}

/** JSONB `badges_earned` element; persisted shape is {@link BadgeEntry}. */
export interface Badge extends Pick<BadgeEntry, 'badge' | 'earned_at'> {
  streak_length?: number;
}

/**
 * Narrow projection of `public.session_quality_log`. PostgreSQL stores
 * `avg_answer_duration_sec` (seconds), not `avg_answer_duration`.
 * For audit columns (flags, dimension_scores, unlock_contribution),
 * see {@link SessionQualityRow}.
 */
export interface SessionQuality {
  id: string;
  user_id: string;
  interview_id: string;
  questions_answered: number;
  total_questions: number;
  avg_answer_duration_sec: number;
  session_score: number;
  quality_met: boolean;
  completed_at: string;
}

export type UnlockScoreType = 'any_dimension' | 'rolling_average' | 'overall_average';

export interface TierUnlockCriteria {
  sessions_required?: number | null;
  min_score?: number | null;
  score_type?: UnlockScoreType;
  [key: string]: unknown;
}

export interface TierPromptModifiers {
  difficulty?: string;
  question_types?: string[];
  [key: string]: unknown;
}

/** `public.tier_config` (see `supabase-migration-retention-system.sql`). */
export interface TierConfig {
  tier_id: UserTierId;
  tier_name: string;
  unlock_criteria: TierUnlockCriteria;
  features_enabled: string[];
  display_order: number;
  description: string | null;
  prompt_modifiers: TierPromptModifiers | Record<string, unknown> | null;
}

/**
 * Session payload synthesized from interviews + evaluations for retention
 * helpers. Maps to streak input via {@link mapSessionDataToStreakPayload}.
 */
export interface SessionData {
  userId: string;
  interviewId: string;
  dimensionScores: DimensionScores;
  overallScore: number;
  questionsAnswered: number;
  totalQuestions: number;
  /** Mean per-answer duration in seconds → `avg_answer_duration_sec` in DB. */
  avgAnswerDuration: number;
}

export const tierIdSchema = z.number().int().min(MIN_TIER).max(MAX_TIER);

export const tierUnlockCriteriaSchema = z
  .object({
    sessions_required: z.number().nullable().optional(),
    min_score: z.number().nullable().optional(),
    score_type: z.enum(['any_dimension', 'rolling_average', 'overall_average']).optional(),
  })
  .passthrough();

export const tierPromptModifiersSchema = z
  .object({
    difficulty: z.string().optional(),
    question_types: z.array(z.string()).optional(),
  })
  .passthrough();

export const tierConfigRowSchema = z.object({
  tier_id: tierIdSchema,
  tier_name: z.string().min(1),
  unlock_criteria: tierUnlockCriteriaSchema,
  features_enabled: z.array(z.string()),
  display_order: z.number().int(),
  description: z.string().nullable(),
  prompt_modifiers: z.union([tierPromptModifiersSchema, z.record(z.string(), z.unknown())]).nullable(),
});

export type TierConfigParsed = z.infer<typeof tierConfigRowSchema>;

export const sessionDataSchema = z.object({
  userId: z.string().uuid(),
  interviewId: z.string().uuid(),
  dimensionScores: dimensionScoresSchema,
  overallScore: z.number().min(0).max(10),
  questionsAnswered: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  avgAnswerDuration: z.number().min(0),
});

export type SessionDataParsed = z.infer<typeof sessionDataSchema>;

/** Same fields as {@link userProgressRowSchema} — alias for PRD naming. */
export const userProgressSchema = userProgressRowSchema;

/** Full `session_quality_log` row boundary validation. */
export const sessionQualityLogRowSchema = sessionQualityRowSchema;
