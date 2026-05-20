/**
 * Hard voice quota limits per plan tier.
 *
 * All limits are monthly (calendar month).
 * Verified plan tiers from CLAUDE.md: free | starter | pro | campus
 *
 * Voice limits are NOT in CLAUDE.md (no existing voice quota system).
 * These values are production recommendations — adjust to match your economics.
 *
 * Monthly voice cost at limit:
 *   Free:    30 min STT ($0.77) + 50k TTS chars ($9.00) = $9.77  [LOSS — gate with care]
 *   Starter: 2h STT ($5.16) + 200k TTS chars ($36.00) = $41.16  vs ₹149 ($1.79) revenue → LOSS
 *   Pro:     10h STT ($25.80) + 1M TTS chars ($180.00) = $205.80 vs ₹399 ($4.79) revenue → LOSS
 *
 * CRITICAL: Voice is loss-making at ALL tiers (see AI_AUDIT.md §7.1).
 * The limits below are conservative safety ceilings. Adjust based on:
 *   1. Your actual ElevenLabs/Deepgram contract rates (NOT VERIFIED in code)
 *   2. Business decision on how much voice subsidy per tier is acceptable
 */

export type PlanTier = 'free' | 'starter' | 'pro' | 'campus' | string;

export interface VoiceQuotaLimits {
  /** Maximum STT recording seconds per calendar month */
  stt_seconds_per_month: number;
  /** Maximum TTS characters per calendar month */
  tts_chars_per_month: number;
  /** Maximum simultaneous voice sessions (concurrency) */
  max_concurrent_sessions: number;
  /** Maximum TTS characters per single interview */
  tts_chars_per_interview: number;
  /** Maximum STT seconds per single interview session */
  stt_seconds_per_interview: number;
  /** Warning threshold (0–1). Emit warning when usage/limit >= this */
  warning_threshold: number;
}

export interface AILimits {
  /** Maximum total LLM cost per user per month (USD) */
  max_llm_cost_per_month_usd: number;
  /** Maximum prompt size in characters sent to any AI call */
  max_prompt_chars: number;
  /** Maximum conversation history tokens (for context truncation) */
  max_history_tokens: number;
}

const LIMITS: Record<string, VoiceQuotaLimits & AILimits> = {
  free: {
    stt_seconds_per_month:      30 * 60,     // 30 minutes
    tts_chars_per_month:        50_000,       // 50k chars
    max_concurrent_sessions:    1,
    tts_chars_per_interview:    3_000,        // ~10 TTS turns
    stt_seconds_per_interview:  10 * 60,      // 10 minutes per session
    warning_threshold:          0.80,
    max_llm_cost_per_month_usd: 0.10,         // ~10 text interviews
    max_prompt_chars:           8_000,
    max_history_tokens:         2_000,
  },
  starter: {
    stt_seconds_per_month:      2 * 60 * 60,  // 2 hours
    tts_chars_per_month:        200_000,
    max_concurrent_sessions:    2,
    tts_chars_per_interview:    5_000,
    stt_seconds_per_interview:  15 * 60,
    warning_threshold:          0.80,
    max_llm_cost_per_month_usd: 0.50,
    max_prompt_chars:           12_000,
    max_history_tokens:         4_000,
  },
  pro: {
    stt_seconds_per_month:      10 * 60 * 60, // 10 hours
    tts_chars_per_month:        1_000_000,
    max_concurrent_sessions:    3,
    tts_chars_per_interview:    8_000,
    stt_seconds_per_interview:  20 * 60,
    warning_threshold:          0.90,
    max_llm_cost_per_month_usd: 5.00,
    max_prompt_chars:           20_000,
    max_history_tokens:         8_000,
  },
  campus: {
    stt_seconds_per_month:      100 * 60 * 60,
    tts_chars_per_month:        10_000_000,
    max_concurrent_sessions:    10,
    tts_chars_per_interview:    10_000,
    stt_seconds_per_interview:  30 * 60,
    warning_threshold:          0.90,
    max_llm_cost_per_month_usd: 100.00,
    max_prompt_chars:           20_000,
    max_history_tokens:         8_000,
  },
};

const DEFAULT_LIMITS = LIMITS.free;

export function getPlanLimits(planTier: PlanTier): VoiceQuotaLimits & AILimits {
  return LIMITS[planTier] ?? DEFAULT_LIMITS;
}

export type QuotaWarningLevel = 'ok' | 'warning' | 'critical' | 'exceeded';

export function getWarningLevel(
  used: number,
  limit: number,
  threshold = 0.80,
): QuotaWarningLevel {
  if (limit === 0) return 'ok';
  const ratio = used / limit;
  if (ratio >= 1.0)  return 'exceeded';
  if (ratio >= 0.90) return 'critical';
  if (ratio >= threshold) return 'warning';
  return 'ok';
}
