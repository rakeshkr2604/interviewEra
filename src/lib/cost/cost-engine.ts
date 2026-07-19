/**
 * Central cost calculation engine.
 *
 * Single source of truth for all AI provider pricing.
 * Prices verified from provider-intelligence.ts (LLM) and provider docs (voice).
 *
 * Update pricing here when providers change rates — nowhere else.
 */

// ─── LLM Pricing (USD per 1M tokens) ────────────────────────────────────────
// Source: provider-intelligence.ts COST_USD_PER_1M (verified).
// gpt-4.1-mini pricing: NOT VERIFIED FROM CODEBASE — using OpenAI published rate.

export type LLMProvider = 'openai' | 'openrouter' | 'mistral';
export type VoiceProvider = 'elevenlabs' | 'deepgram' | 'web_speech';

interface TokenRate {
  input: number;   // USD per 1M input tokens
  output: number;  // USD per 1M output tokens
}

const LLM_RATES: Record<string, TokenRate> = {
  // OpenAI direct (verified from provider-intelligence.ts)
  'openai:gpt-4o-mini':        { input: 0.15,  output: 0.60  },
  // NOT VERIFIED — using OpenAI published rate as of May 2026
  'openai:gpt-4.1-mini':       { input: 0.40,  output: 1.60  },
  // OpenRouter (verified from provider-intelligence.ts)
  'openrouter:openai/gpt-4o-mini':  { input: 0.15, output: 0.60 },
  'openrouter:openai/gpt-4.1-mini': { input: 0.40, output: 1.60 },  // NOT VERIFIED
  // Mistral (verified from provider-intelligence.ts)
  'mistral:mistral-small-latest':   { input: 0.10, output: 0.30 },
  // Embeddings (ATS JD match) — APPROXIMATE rate, embeddings have no output tokens
  'openrouter:openai/text-embedding-3-small': { input: 0.02, output: 0 },
};

// Fallback rate when model not in table
const DEFAULT_LLM_RATE: TokenRate = { input: 0.15, output: 0.60 };

// ─── Voice Pricing ───────────────────────────────────────────────────────────
// ElevenLabs eleven_turbo_v2_5: NOT VERIFIED FROM CODEBASE (no pricing in code).
// Using $0.18/1k chars as pay-per-use estimate. Verify against your ElevenLabs plan.
const ELEVENLABS_USD_PER_1K_CHARS = 0.18;  // NOT VERIFIED — check your ElevenLabs dashboard

// Deepgram nova-3: NOT VERIFIED FROM CODEBASE.
// Using $0.0043/min pay-per-use rate from Deepgram published pricing.
const DEEPGRAM_USD_PER_SECOND = 0.0043 / 60;  // NOT VERIFIED — check your Deepgram dashboard

// ─── Cost calculation functions ──────────────────────────────────────────────

export function calculateLLMCost(
  provider: LLMProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const key = `${provider}:${model}`;
  const rate = LLM_RATES[key] ?? DEFAULT_LLM_RATE;
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}

export function calculateTTSCost(chars: number): number {
  return (chars / 1000) * ELEVENLABS_USD_PER_1K_CHARS;
}

export function calculateSTTCost(durationMs: number): number {
  return (durationMs / 1000) * DEEPGRAM_USD_PER_SECOND;
}

// ─── Per-interview cost estimation ──────────────────────────────────────────

export interface InterviewCostEstimate {
  llm_usd: number;
  tts_usd: number;
  stt_usd: number;
  total_usd: number;
  is_voice: boolean;
}

/** Rough pre-interview estimate for quota checks and projections. */
export function estimateInterviewCost(isVoice: boolean, questionCount = 6): InterviewCostEstimate {
  // Verified averages from AI_AUDIT.md cost analysis
  const llm_usd =
    0.00065 +          // question generation
    questionCount * 0.00054 +  // answer evaluations
    questionCount * 0.000135 + // agent analyses
    4 * 0.000148 +     // follow-up generations
    0.00165;           // report generation (estimated — NOT VERIFIED)

  const tts_usd = isVoice ? calculateTTSCost(1300) : 0;    // avg 1300 chars/voice interview
  const stt_usd = isVoice ? calculateSTTCost(10 * 60_000) : 0;  // avg 10 min STT

  return {
    llm_usd: Math.round(llm_usd * 1e6) / 1e6,
    tts_usd: Math.round(tts_usd * 1e6) / 1e6,
    stt_usd: Math.round(stt_usd * 1e6) / 1e6,
    total_usd: Math.round((llm_usd + tts_usd + stt_usd) * 1e6) / 1e6,
    is_voice: isVoice,
  };
}

// ─── Plan revenue context (for margin calculations) ──────────────────────────
// Verified from CLAUDE.md pricing table.

export const PLAN_MONTHLY_REVENUE_INR: Record<string, number> = {
  free:         0,
  starter:    149,
  pro:        399,
  campus:     799, // per student/year → ~66.6/month
};

// Approximate July 2026 rate. Update manually when rate drifts significantly.
export const USD_TO_INR = 84;
const INR_TO_USD = 1 / USD_TO_INR;

export function planMonthlyRevenueUSD(planTier: string): number {
  const inr = PLAN_MONTHLY_REVENUE_INR[planTier] ?? 0;
  return inr * INR_TO_USD;
}

/** Gross AI margin for a plan tier given monthly AI spend. */
export function grossAIMargin(planTier: string, monthlyAISpendUSD: number): number {
  const revenue = planMonthlyRevenueUSD(planTier);
  if (revenue === 0) return -monthlyAISpendUSD; // free users are pure cost
  return (revenue - monthlyAISpendUSD) / revenue;
}
