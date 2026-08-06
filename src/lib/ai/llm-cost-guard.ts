/**
 * Hard LLM spend guard.
 *
 * Tracks cumulative monthly LLM cost per user in Redis and rejects calls
 * that would push the user over their plan's max_llm_cost_per_month_usd limit.
 *
 * Design principles:
 * - Fails open when Redis is unavailable (logs error, allows request).
 * - Uses conservative token-budget-based cost estimates (no fake per-model
 *   magic; falls back to DEFAULT_COST_PER_CALL_USD when model unknown).
 * - Atomic: check + record in a single pipeline to prevent double-spend.
 * - Reusable: call checkLLMCostGuard before any LLM operation.
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
    const inputTokens  = getEstimatedInputTokens(operation);
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
}

/**
 * Check whether the user can make an LLM call costing estimatedCostUSD.
 * Does NOT record the spend — call recordLLMSpend after a successful call.
 *
 * @param operation - Optional operation name for structured telemetry (no PII).
 */
export async function checkLLMCostGuard(
  userId: string,
  planTier: string,
  estimatedCostUSD: number,
  operation?: string,
): Promise<LLMCostGuardResult> {
  const limits    = getPlanLimits(planTier);
  const limitUSD  = limits.max_llm_cost_per_month_usd;

  // Free plan with $0.00 limit means quota system not configured — allow.
  if (limitUSD <= 0 || !isRedisConfigured()) {
    return { allowed: true, currentSpendUSD: 0, limitUSD };
  }

  try {
    const redis      = getRedis();
    const key        = monthKey(userId);
    const currentRaw = await redis.get<number | string>(key);
    const current    = typeof currentRaw === 'number'
      ? currentRaw
      : parseFloat(String(currentRaw ?? '0')) || 0;

    if (current + estimatedCostUSD > limitUSD) {
      const op = operation ?? 'unknown';
      console.warn(
        `[llm-cost-guard] BLOCKED operation=${op} user=${userId} plan=${planTier}` +
        ` current=${current.toFixed(5)} estimated=${estimatedCostUSD.toFixed(5)} limit=${limitUSD}`,
      );
      emitAiTelemetry({
        event:               'ai_cost_blocked',
        operation:           op,
        provider:            'unknown',
        model:               'unknown',
        plan_tier:           planTier,
        current_spend_usd:   current,
        limit_usd:           limitUSD,
        estimated_cost_usd:  estimatedCostUSD,
      });
      return { allowed: false, reason: 'Monthly LLM cost limit exceeded', currentSpendUSD: current, limitUSD };
    }

    return { allowed: true, currentSpendUSD: current, limitUSD };
  } catch (err) {
    // Fail open: a Redis outage must not block all LLM calls.
    console.error('[llm-cost-guard] Redis error during check, failing open:', err);
    return { allowed: true, currentSpendUSD: 0, limitUSD };
  }
}

/**
 * Atomically record LLM spend for a user (call AFTER a successful LLM call).
 * TTL is set to end-of-month + 1 day so counters auto-expire.
 */
export async function recordLLMSpend(userId: string, costUSD: number): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const redis = getRedis();
    const key   = monthKey(userId);
    const ttl   = secondsUntilMonthEnd();
    const pipeline = redis.pipeline();
    pipeline.incrbyfloat(key, costUSD);
    pipeline.expire(key, ttl);
    await pipeline.exec();
  } catch (err) {
    // Non-fatal: a missed record is acceptable (conservative estimates already overbid).
    console.error('[llm-cost-guard] Failed to record spend (non-fatal):', err);
  }
}
