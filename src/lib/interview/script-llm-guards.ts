/**
 * In-route abuse controls for v2.1 script interview LLM endpoints.
 *
 * Independent of proxy IP rate limits. Policy:
 * - Redis configured + healthy: enforce per-user fixed windows + monthly cost reserve
 * - Redis unconfigured (local DX): allow (same as checkRateLimit)
 * - Redis errors: fail closed (503) — never silent unlimited LLM
 *
 * Cost reservations are atomic (incr-then-check). Release on LLM failure;
 * keep on success (already counted).
 */

import { NextResponse } from 'next/server';
import {
  buildRateLimitHttpResponse,
  checkRateLimit,
} from '@/lib/redis/rate-limit';
import {
  estimateLLMCallCostUSD,
  reserveLLMCost,
} from '@/lib/ai/llm-cost-guard';
import type { AiOperation } from '@/lib/ai/operation-registry';

export type ScriptLlmRoute = 'turn' | 'answer_score' | 'auto_structure' | 'report';

type RoutePolicy = {
  redisKeyPrefix: string;
  windowSeconds: number;
  limit: number;
  tooManyMessage: string;
  operation: AiOperation;
};

const SCRIPT_LLM_RL: Record<ScriptLlmRoute, RoutePolicy> = {
  turn: {
    redisKeyPrefix: 'script_llm:turn',
    windowSeconds: 60,
    limit: 30,
    tooManyMessage: 'Too many interviewer requests. Please wait a moment and try again.',
    operation: 'script_turn_generation',
  },
  answer_score: {
    redisKeyPrefix: 'script_llm:answer_score',
    windowSeconds: 60,
    limit: 20,
    tooManyMessage: 'Too many scoring requests. Please wait a moment and try again.',
    operation: 'answer_score',
  },
  auto_structure: {
    redisKeyPrefix: 'script_llm:auto_structure',
    windowSeconds: 60,
    limit: 20,
    tooManyMessage: 'Too many structure-assist requests. Please wait a moment and try again.',
    operation: 'auto_structure',
  },
  report: {
    redisKeyPrefix: 'script_llm:report',
    windowSeconds: 60,
    limit: 10,
    tooManyMessage: 'Too many report requests. Please wait a moment and try again.',
    operation: 'script_report_synthesis',
  },
};

export function getScriptLlmRoutePolicy(route: ScriptLlmRoute): RoutePolicy {
  return SCRIPT_LLM_RL[route];
}

/**
 * Per-user fail-closed rate limit. Returns a NextResponse to send, or null if allowed.
 */
export async function enforceScriptLlmRateLimit(
  userId: string,
  route: ScriptLlmRoute,
): Promise<NextResponse | null> {
  const policy = SCRIPT_LLM_RL[route];
  const rl = await checkRateLimit(
    `${policy.redisKeyPrefix}:${userId}`,
    policy.windowSeconds,
    policy.limit,
    { failClosed: true },
  );
  const blocked = buildRateLimitHttpResponse(rl, policy.tooManyMessage);
  if (!blocked) return null;
  return NextResponse.json(blocked.body, {
    status: blocked.status,
    headers: {
      ...blocked.headers,
      'X-RateLimit-Remaining': String(rl.remaining),
    },
  });
}

export type ScriptLlmCostReservation = {
  estimatedCostUSD: number;
  /** Call after a failed LLM attempt to refund the reservation. No-op after success. */
  release: () => Promise<void>;
};

/**
 * Atomically reserve monthly LLM budget for a script operation (fail-closed on Redis errors).
 */
export async function reserveScriptLlmCost(
  userId: string,
  planTier: string,
  route: ScriptLlmRoute,
): Promise<{ ok: true; reservation: ScriptLlmCostReservation } | { ok: false; response: NextResponse }> {
  const policy = SCRIPT_LLM_RL[route];
  const estimatedCostUSD = estimateLLMCallCostUSD(policy.operation);
  const reserved = await reserveLLMCost(
    userId,
    planTier,
    estimatedCostUSD,
    policy.operation,
    { failClosed: true },
  );

  if (!reserved.ok) {
    const status = reserved.redisUnavailable ? 503 : 429;
    const code = reserved.redisUnavailable
      ? 'llm_cost_backend_unavailable'
      : 'llm_cost_limit_exceeded';
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: reserved.reason,
          code,
        },
        {
          status,
          headers: status === 503 ? { 'Retry-After': '30' } : undefined,
        },
      ),
    };
  }

  return {
    ok: true,
    reservation: {
      estimatedCostUSD: reserved.estimatedCostUSD,
      release: reserved.release,
    },
  };
}
