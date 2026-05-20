/**
 * Per-request resource budget engine.
 *
 * Tracks how many providers have been attempted and how much latency has been
 * consumed within a single logical AI operation. Enforces hard limits to prevent
 * retry amplification when multiple providers each retry internally.
 *
 * The operation-level outer deadline (timeout-policy.ts) remains the final backstop.
 * This engine adds an earlier, softer check: "should we even START the next provider
 * given what we've spent so far?"
 *
 * Usage:
 *   const budget = createRequestBudget('followup_generation');
 *   const check  = canAttemptProvider(budget, 'openrouter');
 *   if (!check.allowed) { log(check.reason); throw / return early; }
 *   recordBudgetAttempt(budget, 'openrouter', false);
 *   // ... provider call ...
 */

import { classifyRequest, type RequestClass } from '@/lib/ai/provider-intelligence';

// ─── Limits per request class ─────────────────────────────────────────────────

interface BudgetLimits {
  /**
   * Max distinct provider families to try (openrouter, openai, mistral each count once).
   * Realtime operations are capped at 2 — a third-provider attempt is too slow.
   */
  maxProviderDepth: number;
  /**
   * Max retries to the SAME provider (e.g., json-mode → plain-mode retry in interview-completion).
   * Does not count depth changes.
   */
  maxSameProviderRetries: number;
  /**
   * Hard wall-clock budget for the entire chain including all attempts.
   * The outer timeout-policy deadline is stricter for most ops; this acts as a
   * secondary gate before a NEW provider attempt begins.
   */
  maxTotalLatencyMs: number;
}

const BUDGET_LIMITS: Record<RequestClass, BudgetLimits> = {
  realtime_critical: {
    maxProviderDepth:       2,       // Fast fail after 2 providers
    maxSameProviderRetries: 1,
    maxTotalLatencyMs:      8_000,
  },
  structured_evaluation: {
    maxProviderDepth:       3,
    maxSameProviderRetries: 2,
    maxTotalLatencyMs:      14_000,
  },
  batch_analysis: {
    maxProviderDepth:       3,
    maxSameProviderRetries: 2,
    maxTotalLatencyMs:      25_000,
  },
  lightweight_parse: {
    maxProviderDepth:       3,
    maxSameProviderRetries: 1,
    maxTotalLatencyMs:      15_000,
  },
};

// ─── Budget object ────────────────────────────────────────────────────────────

export interface RequestBudget {
  readonly operation:    string;
  readonly requestClass: RequestClass;
  readonly limits:       Readonly<BudgetLimits>;
  readonly startTs:      number;

  // Mutable execution state — updated via recordBudgetAttempt()
  providerDepth:          number;
  sameProviderRetries:    number;
  /** Ordered list of provider keys tried so far. */
  providersAttempted:     string[];
}

export interface BudgetCheckResult {
  allowed:     boolean;
  reason?:     string;
  elapsedMs:   number;
  remainingMs: number;
}

export interface BudgetSnapshot {
  operation:           string;
  requestClass:        string;
  elapsedMs:           number;
  remainingMs:         number;
  providerDepth:       number;
  sameProviderRetries: number;
  providersAttempted:  string;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createRequestBudget(operation: string): RequestBudget {
  const requestClass = classifyRequest(operation);
  return {
    operation,
    requestClass,
    limits:                BUDGET_LIMITS[requestClass],
    startTs:               Date.now(),
    providerDepth:         0,
    sameProviderRetries:   0,
    providersAttempted:    [],
  };
}

// ─── Gate check ───────────────────────────────────────────────────────────────

/**
 * Returns whether attempting the given provider is within budget.
 * Call this BEFORE each provider attempt; abort if !allowed.
 */
export function canAttemptProvider(
  budget: RequestBudget,
  providerKey: string,
): BudgetCheckResult {
  const elapsedMs   = Date.now() - budget.startTs;
  const remainingMs = Math.max(0, budget.limits.maxTotalLatencyMs - elapsedMs);

  if (elapsedMs >= budget.limits.maxTotalLatencyMs) {
    return {
      allowed:     false,
      reason:      `latency_budget_exceeded(${elapsedMs}ms >= ${budget.limits.maxTotalLatencyMs}ms)`,
      elapsedMs,
      remainingMs: 0,
    };
  }

  const isNewProvider = !budget.providersAttempted.includes(providerKey);

  if (isNewProvider && budget.providerDepth >= budget.limits.maxProviderDepth) {
    return {
      allowed:   false,
      reason:    `provider_depth_limit(${budget.providerDepth}/${budget.limits.maxProviderDepth})`,
      elapsedMs,
      remainingMs,
    };
  }

  if (!isNewProvider && budget.sameProviderRetries >= budget.limits.maxSameProviderRetries) {
    return {
      allowed:   false,
      reason:    `same_provider_retry_limit(${budget.sameProviderRetries}/${budget.limits.maxSameProviderRetries})`,
      elapsedMs,
      remainingMs,
    };
  }

  return { allowed: true, elapsedMs, remainingMs };
}

// ─── State update ─────────────────────────────────────────────────────────────

/**
 * Record that a provider attempt has started.
 * Call this AFTER canAttemptProvider returns allowed=true, before the async call.
 */
export function recordBudgetAttempt(
  budget: RequestBudget,
  providerKey: string,
): void {
  const isNewProvider = !budget.providersAttempted.includes(providerKey);
  if (isNewProvider) {
    budget.providerDepth++;
    budget.providersAttempted.push(providerKey);
  } else {
    budget.sameProviderRetries++;
  }
}

// ─── Observability ────────────────────────────────────────────────────────────

export function budgetSnapshot(budget: RequestBudget): BudgetSnapshot {
  const elapsedMs = Date.now() - budget.startTs;
  return {
    operation:           budget.operation,
    requestClass:        budget.requestClass,
    elapsedMs,
    remainingMs:         Math.max(0, budget.limits.maxTotalLatencyMs - elapsedMs),
    providerDepth:       budget.providerDepth,
    sameProviderRetries: budget.sameProviderRetries,
    providersAttempted:  budget.providersAttempted.join(' → '),
  };
}

/**
 * Returns a warning string if the budget is close to exhaustion (> 75% of
 * latency or depth consumed). Returns null if well within limits.
 */
export function budgetWarning(budget: RequestBudget): string | null {
  const elapsedMs = Date.now() - budget.startTs;
  const latencyPct = elapsedMs / budget.limits.maxTotalLatencyMs;
  const depthPct   = budget.providerDepth / budget.limits.maxProviderDepth;

  if (latencyPct > 0.75) {
    return `[budget] ${budget.operation}: ${Math.round(latencyPct * 100)}% of latency budget consumed`;
  }
  if (depthPct > 0.75) {
    return `[budget] ${budget.operation}: ${budget.providerDepth}/${budget.limits.maxProviderDepth} provider depth`;
  }
  return null;
}
