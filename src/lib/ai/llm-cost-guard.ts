/**
 * Hard LLM spend guard.
 *
 * Tracks cumulative monthly LLM cost per user in Redis and rejects calls
 * that would push the user over their plan's max_llm_cost_per_month_usd limit.
 *
 * Modes:
 * - checkLLMCostGuard (legacy): non-atomic check; fail-open on Redis errors by default
 * - reserveLLMCost / releaseLLMCostReservation: atomic incr-then-check; optional failClosed
 *
 * Unconfigured Redis (local DX): allow — same convention as checkRateLimit.
 * Production must configure Upstash so failClosed is meaningful.
 */

import getRedis, { isRedisConfigured } from '@/lib/redis/client';
import { getPlanLimits } from '@/lib/quota/plan-limits';
import { getTokenBudget, type AiOperation } from '@/lib/ai/token-budget';
import { getEstimatedInputTokens } from '@/lib/ai/operation-registry';
import { calculateLLMCost, type LLMProvider } from '@/lib/cost/cost-engine';
import { emitAiTelemetry } from '@/lib/observability/ai-telemetry';

// Conservative default when provider/model is unknown (uses gpt-4o-mini rate).
const DEFAULT_COST_PER_CALL_USD = 0.0015;

/**
 * Returns a conservative cost estimate for one LLM call.
 * Uses output token budget + estimated input tokens + provider pricing.
 * Input-token estimates are owned by operation-registry.ts.
 */
export function estimateLLMCallCostUSD(
  operation: AiOperation,
  provider: LLMProvider = 'openrouter',
  model = 'openai/gpt-4o-mini',
): number {
  try {
    const outputTokens = getTokenBudget(operation);
    const inputTokens = getEstimatedInputTokens(operation);
    return calculateLLMCost(provider, model, inputTokens, outputTokens);
  } catch {
    return DEFAULT_COST_PER_CALL_USD;
  }
}

function monthKey(userId: string): string {
  const now = new Date();
  return `llm_cost:${userId}:${now.getUTCFullYear()}:${now.getUTCMonth() + 1}`;
}

function secondsUntilMonthEnd(): number {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000) + 86400; // +1 day buffer
}

export interface LLMCostGuardResult {
  allowed: boolean;
  reason?: string;
  currentSpendUSD: number;
  limitUSD: number;
  /** Set when Redis errored and failClosed blocked the request. */
  redisUnavailable?: boolean;
}

export type LLMCostGuardOptions = {
  /**
   * When true, Redis errors deny the request (expensive script LLM paths).
   * Default false — fail open (legacy answer-evaluation path).
   */
  failClosed?: boolean;
};

/**
 * Check whether the user can make an LLM call costing estimatedCostUSD.
 * Does NOT record the spend — call recordLLMSpend after a successful call,
 * or prefer reserveLLMCost for concurrency-safe accounting.
 *
 * @param operation - Optional operation name for structured telemetry (no PII).
 */
export async function checkLLMCostGuard(
  userId: string,
  planTier: string,
  estimatedCostUSD: number,
  operation?: string,
  options: LLMCostGuardOptions = {},
): Promise<LLMCostGuardResult> {
  const { failClosed = false } = options;
  const limits = getPlanLimits(planTier);
  const limitUSD = limits.max_llm_cost_per_month_usd;

  // Free plan with $0.00 limit means quota system not configured — allow.
  if (limitUSD <= 0) {
    return { allowed: true, currentSpendUSD: 0, limitUSD };
  }

  // Unconfigured Redis (typical local): fail-open even for failClosed callers.
  if (!isRedisConfigured()) {
    return { allowed: true, currentSpendUSD: 0, limitUSD };
  }

  try {
    const redis = getRedis();
    const key = monthKey(userId);
    const currentRaw = await redis.get<number | string>(key);
    const current =
      typeof currentRaw === 'number' ? currentRaw : parseFloat(String(currentRaw ?? '0')) || 0;

    if (current + estimatedCostUSD > limitUSD) {
      const op = operation ?? 'unknown';
      console.warn(
        `[llm-cost-guard] BLOCKED operation=${op} user=${userId} plan=${planTier}` +
          ` current=${current.toFixed(5)} estimated=${estimatedCostUSD.toFixed(5)} limit=${limitUSD}`,
      );
      emitAiTelemetry({
        event: 'ai_cost_blocked',
        operation: op,
        provider: 'unknown',
        model: 'unknown',
        plan_tier: planTier,
        current_spend_usd: current,
        limit_usd: limitUSD,
        estimated_cost_usd: estimatedCostUSD,
      });
      return {
        allowed: false,
        reason: 'Monthly LLM cost limit exceeded',
        currentSpendUSD: current,
        limitUSD,
      };
    }

    return { allowed: true, currentSpendUSD: current, limitUSD };
  } catch (err) {
    if (failClosed) {
      console.error('[llm-cost-guard] Redis error during check, failing closed:', err);
      return {
        allowed: false,
        reason: 'Service temporarily unavailable. Please retry in a moment.',
        currentSpendUSD: 0,
        limitUSD,
        redisUnavailable: true,
      };
    }
    console.error('[llm-cost-guard] Redis error during check, failing open:', err);
    return { allowed: true, currentSpendUSD: 0, limitUSD };
  }
}

export type LLMCostReservation =
  | {
      ok: true;
      estimatedCostUSD: number;
      currentSpendUSD: number;
      limitUSD: number;
      /** Release reserved spend after a failed LLM attempt (not after success). */
      release: () => Promise<void>;
    }
  | {
      ok: false;
      reason: string;
      currentSpendUSD: number;
      limitUSD: number;
      redisUnavailable?: boolean;
    };

/**
 * Atomically reserve estimated cost against the monthly budget before an LLM call.
 * On success the spend is already recorded; do not also call recordLLMSpend.
 * On LLM failure, call release() to refund the reservation.
 */
export async function reserveLLMCost(
  userId: string,
  planTier: string,
  estimatedCostUSD: number,
  operation?: string,
  options: LLMCostGuardOptions = {},
): Promise<LLMCostReservation> {
  const { failClosed = false } = options;
  const limits = getPlanLimits(planTier);
  const limitUSD = limits.max_llm_cost_per_month_usd;
  const cost = Math.max(0, estimatedCostUSD);

  if (limitUSD <= 0 || cost === 0) {
    return {
      ok: true,
      estimatedCostUSD: cost,
      currentSpendUSD: 0,
      limitUSD,
      release: async () => undefined,
    };
  }

  if (!isRedisConfigured()) {
    return {
      ok: true,
      estimatedCostUSD: cost,
      currentSpendUSD: 0,
      limitUSD,
      release: async () => undefined,
    };
  }

  const key = monthKey(userId);
  const ttl = secondsUntilMonthEnd();
  const op = operation ?? 'unknown';

  try {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    pipeline.incrbyfloat(key, cost);
    pipeline.expire(key, ttl);
    const [newTotalRaw] = await pipeline.exec<[number | string, unknown]>();
    const newTotal =
      typeof newTotalRaw === 'number' ? newTotalRaw : parseFloat(String(newTotalRaw ?? '0')) || 0;

    if (newTotal > limitUSD) {
      try {
        await redis.incrbyfloat(key, -cost);
      } catch (releaseErr) {
        console.error('[llm-cost-guard] failed to roll back over-limit reservation:', releaseErr);
      }
      console.warn(
        `[llm-cost-guard] RESERVE_BLOCKED operation=${op} user=${userId} plan=${planTier}` +
          ` newTotal=${newTotal.toFixed(5)} estimated=${cost.toFixed(5)} limit=${limitUSD}`,
      );
      emitAiTelemetry({
        event: 'ai_cost_blocked',
        operation: op,
        provider: 'unknown',
        model: 'unknown',
        plan_tier: planTier,
        current_spend_usd: Math.max(0, newTotal - cost),
        limit_usd: limitUSD,
        estimated_cost_usd: cost,
      });
      return {
        ok: false,
        reason: 'Monthly LLM cost limit exceeded',
        currentSpendUSD: Math.max(0, newTotal - cost),
        limitUSD,
      };
    }

    let released = false;
    return {
      ok: true,
      estimatedCostUSD: cost,
      currentSpendUSD: newTotal,
      limitUSD,
      release: async () => {
        if (released) return;
        released = true;
        await releaseLLMCostReservation(userId, cost);
      },
    };
  } catch (err) {
    if (failClosed) {
      console.error('[llm-cost-guard] Redis error during reserve, failing closed:', err);
      return {
        ok: false,
        reason: 'Service temporarily unavailable. Please retry in a moment.',
        currentSpendUSD: 0,
        limitUSD,
        redisUnavailable: true,
      };
    }
    console.error('[llm-cost-guard] Redis error during reserve, failing open:', err);
    return {
      ok: true,
      estimatedCostUSD: cost,
      currentSpendUSD: 0,
      limitUSD,
      release: async () => undefined,
    };
  }
}

/** Refund a prior reservation (best-effort). */
export async function releaseLLMCostReservation(
  userId: string,
  costUSD: number,
): Promise<void> {
  if (!isRedisConfigured() || costUSD <= 0) return;
  try {
    const redis = getRedis();
    await redis.incrbyfloat(monthKey(userId), -costUSD);
  } catch (err) {
    console.error('[llm-cost-guard] Failed to release reservation (non-fatal):', err);
  }
}

/**
 * Atomically record LLM spend for a user (call AFTER a successful LLM call
 * when using checkLLMCostGuard without reserve).
 * TTL is set to end-of-month + 1 day so counters auto-expire.
 */
export async function recordLLMSpend(userId: string, costUSD: number): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const redis = getRedis();
    const key = monthKey(userId);
    const ttl = secondsUntilMonthEnd();
    const pipeline = redis.pipeline();
    pipeline.incrbyfloat(key, costUSD);
    pipeline.expire(key, ttl);
    await pipeline.exec();
  } catch (err) {
    // Non-fatal: a missed record is acceptable (conservative estimates already overbid).
    console.error('[llm-cost-guard] Failed to record spend (non-fatal):', err);
  }
}
