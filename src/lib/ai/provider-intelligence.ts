/**
 * Adaptive provider intelligence engine.
 *
 * Maintains rolling performance windows per provider and computes real-time scores
 * for routing decisions. All metrics derive exclusively from actual call outcomes —
 * zero synthetic or fake data.
 *
 * Architecture:
 * - Module-level singleton (process-scoped, resets on cold start — intentional;
 *   same pattern as provider-health circuit breaker)
 * - Rolling window: last 50 samples OR last 10 minutes per provider family
 * - Adaptive routing activates only when ≥MIN_SAMPLES observed per provider
 * - Below MIN_SAMPLES: static ordering from provider-policy.ts is unchanged
 * - Routing is only reordered when composite score gap ≥ RERANK_THRESHOLD points
 */

import { OPENROUTER_CHEAP_MODEL } from '@/lib/ai/openrouter-model-router';
import { logAICall } from '@/lib/telemetry/ai-logger';
import { emitAiTelemetry } from '@/lib/observability/ai-telemetry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProviderKey = 'openrouter' | 'openai' | 'mistral';

/**
 * Request classification — determines which scoring dimension is prioritised.
 * Maps from operation name to priority class.
 */
export type RequestClass =
  | 'realtime_critical'      // followup, agent — latency first
  | 'structured_evaluation'  // answer evaluation — schema reliability first
  | 'batch_analysis'         // report generation — cost-sensitive, can be slower
  | 'lightweight_parse';     // resume/question/jd — balanced

export interface ProviderCallOutcome {
  provider: ProviderKey;
  operation: string;
  /** Model name — used for telemetry. Defaults to the canonical model for the provider. */
  model?: string;
  latencyMs: number;
  success: boolean;
  /** true only when the error was an AbortError / timeout */
  timeout: boolean;
  /** true when the provider returned insufficient_quota or 402 */
  quotaExhausted: boolean;
  /**
   * Was the AI output valid parseable JSON for this operation?
   * Pass `true` for non-JSON operations (followup, question gen) — only
   * callers that parse structured output should set this accurately.
   */
  jsonValid: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

export interface ProviderStats {
  sampleCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  timeoutRate: number;
  failureRate: number;
  quotaExhaustionRate: number;
  jsonValidityRate: number;
  successRate: number;
  totalEstimatedCostUsd: number;
}

export interface ProviderScore {
  /** 0-100: derived from success rate + quota stability */
  reliability: number;
  /** 0-100: based on p95 latency — lower latency = higher score */
  latency: number;
  /** 0-100: static per-provider cost ranking */
  costEfficiency: number;
  /** 0-100: JSON validity rate for structured operations */
  schemaReliability: number;
  /** Weighted composite per request class */
  compositeByClass: Record<RequestClass, number>;
}

export interface IntelligenceSummary {
  timestamp: string;
  sampleCounts: Record<ProviderKey, number>;
  scores: Record<ProviderKey, ProviderScore | null>;
  totalEstimatedCostUsd: number;
  routingBasis: 'static' | 'intelligence';
}

// ─── Configuration ────────────────────────────────────────────────────────────

/** Minimum samples per provider before adaptive routing activates. */
const MIN_SAMPLES = 5;

/** Minimum composite score gap (0-100 scale) required to reorder providers.
 *  Prevents churn when providers are performing similarly. */
const RERANK_THRESHOLD = 10;

const MAX_SAMPLES = 50;
const WINDOW_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Public pricing in USD per 1M tokens (input, output). */
const COST_USD_PER_1M: Record<ProviderKey, { input: number; output: number }> = {
  openrouter: { input: 0.15, output: 0.60 }, // gpt-4o-mini via OpenRouter
  openai:     { input: 0.15, output: 0.60 }, // gpt-4o-mini direct
  mistral:    { input: 0.10, output: 0.30 }, // mistral-small-latest
};

/**
 * Score weights [reliability, latency, costEfficiency, schemaReliability].
 * Sum must equal 1.0 for each class.
 */
const SCORE_WEIGHTS: Record<RequestClass, [number, number, number, number]> = {
  realtime_critical:     [0.35, 0.50, 0.05, 0.10],
  structured_evaluation: [0.35, 0.15, 0.10, 0.40],
  batch_analysis:        [0.40, 0.20, 0.30, 0.10],
  lightweight_parse:     [0.40, 0.30, 0.15, 0.15],
};

const OPERATION_CLASSES: Record<string, RequestClass> = {
  followup_generation:  'realtime_critical',
  agent_analysis:       'realtime_critical',
  answer_evaluation:    'structured_evaluation',
  report_generation:    'batch_analysis',
  resume_parse:         'lightweight_parse',
  jd_parse:             'lightweight_parse',
  jd_validate:          'lightweight_parse',
  document_classify:    'lightweight_parse',
  question_generation:  'lightweight_parse',
  free_tool:            'lightweight_parse',
};

export function classifyRequest(operation: string): RequestClass {
  return OPERATION_CLASSES[operation] ?? 'lightweight_parse';
}

// ─── Internal sample shape ────────────────────────────────────────────────────

interface ProviderSample {
  ts: number;
  latencyMs: number;
  success: boolean;
  timeout: boolean;
  quotaExhausted: boolean;
  jsonValid: boolean;
  inputTokens: number;
  outputTokens: number;
}

// ─── Module-level state (process-scoped singleton) ────────────────────────────

const _windows: Record<ProviderKey, ProviderSample[]> = {
  openrouter: [],
  openai:     [],
  mistral:    [],
};

let _totalCostUsd = 0;

// ─── Window management ────────────────────────────────────────────────────────

function pruneWindow(provider: ProviderKey): void {
  const cutoff = Date.now() - WINDOW_TTL_MS;
  _windows[provider] = _windows[provider]
    .filter((s) => s.ts >= cutoff)
    .slice(-MAX_SAMPLES);
}

// ─── Record outcomes ──────────────────────────────────────────────────────────

/**
 * Record the outcome of a single provider call attempt.
 * Call this immediately after each provider attempt resolves (success or failure).
 */
/** Last-resort model labels when a caller omits `model` — must match router policy. */
const DEFAULT_MODELS: Record<ProviderKey, string> = {
  openrouter: OPENROUTER_CHEAP_MODEL,
  openai:     'gpt-4o-mini',
  mistral:    'mistral-small-latest',
};

export function recordProviderOutcome(outcome: ProviderCallOutcome): void {
  pruneWindow(outcome.provider);

  const inputTokens  = outcome.inputTokens  ?? 0;
  const outputTokens = outcome.outputTokens ?? 0;

  const costSpec = COST_USD_PER_1M[outcome.provider];
  _totalCostUsd += (inputTokens * costSpec.input + outputTokens * costSpec.output) / 1_000_000;

  _windows[outcome.provider].push({
    ts:            Date.now(),
    latencyMs:     outcome.latencyMs,
    success:       outcome.success,
    timeout:       outcome.timeout,
    quotaExhausted: outcome.quotaExhausted,
    jsonValid:     outcome.jsonValid,
    inputTokens,
    outputTokens,
  });

  const resolvedModel = outcome.model ?? DEFAULT_MODELS[outcome.provider];

  // Fire-and-forget: DB telemetry row
  void logAICall({
    operation:      outcome.operation,
    provider:       outcome.provider,
    model:          resolvedModel,
    input_tokens:   inputTokens || undefined,
    output_tokens:  outputTokens || undefined,
    latency_ms:     outcome.latencyMs,
    success:        outcome.success,
    error_category: outcome.timeout
      ? 'timeout'
      : outcome.quotaExhausted
        ? 'quota'
        : undefined,
    json_parse_ok:  outcome.jsonValid,
  });

  // Structured stdout event — picked up by log aggregators (Vercel Logs, Datadog, etc.)
  if (outcome.success) {
    emitAiTelemetry({
      event:      'ai_request_success',
      operation:  outcome.operation,
      provider:   outcome.provider,
      model:      resolvedModel,
      attempt:    1,
      latency_ms: outcome.latencyMs,
    });
  } else {
    emitAiTelemetry({
      event:      'ai_request_failure',
      operation:  outcome.operation,
      provider:   outcome.provider,
      model:      resolvedModel,
      attempt:    1,
      error_code: outcome.timeout
        ? 'timeout'
        : outcome.quotaExhausted
          ? 'quota_exhausted'
          : 'provider_error',
    });
  }
}

// ─── Compute stats ────────────────────────────────────────────────────────────

export function getProviderStats(provider: ProviderKey): ProviderStats {
  pruneWindow(provider);
  const w = _windows[provider];

  if (w.length === 0) {
    return {
      sampleCount:           0,
      avgLatencyMs:          0,
      p95LatencyMs:          0,
      timeoutRate:           0,
      failureRate:           0,
      quotaExhaustionRate:   0,
      jsonValidityRate:      1,
      successRate:           1,
      totalEstimatedCostUsd: 0,
    };
  }

  const n      = w.length;
  const sorted = [...w].sort((a, b) => a.latencyMs - b.latencyMs);
  const p95idx = Math.min(Math.floor(n * 0.95), n - 1);

  const totalInput  = w.reduce((s, x) => s + x.inputTokens,  0);
  const totalOutput = w.reduce((s, x) => s + x.outputTokens, 0);
  const costSpec    = COST_USD_PER_1M[provider];

  return {
    sampleCount:           n,
    avgLatencyMs:          w.reduce((s, x) => s + x.latencyMs,      0) / n,
    p95LatencyMs:          sorted[p95idx].latencyMs,
    timeoutRate:           w.filter((x) => x.timeout).length        / n,
    failureRate:           w.filter((x) => !x.success).length       / n,
    quotaExhaustionRate:   w.filter((x) => x.quotaExhausted).length / n,
    jsonValidityRate:      1 - w.filter((x) => !x.jsonValid).length / n,
    successRate:           1 - w.filter((x) => !x.success).length   / n,
    totalEstimatedCostUsd: (totalInput * costSpec.input + totalOutput * costSpec.output) / 1_000_000,
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const NEUTRAL_SCORE = 65; // Used when sampleCount < MIN_SAMPLES

function scoreReliability(stats: ProviderStats): number {
  if (stats.sampleCount < MIN_SAMPLES) return NEUTRAL_SCORE;
  return Math.max(0, Math.min(100,
    stats.successRate * 80 + (1 - stats.quotaExhaustionRate) * 20,
  ));
}

function scoreLatency(stats: ProviderStats): number {
  if (stats.sampleCount < MIN_SAMPLES) return NEUTRAL_SCORE;
  // 0ms → 100, 13000ms → 0.  Calibrated for typical LLM call latencies.
  return Math.max(0, Math.min(100, 100 - stats.p95LatencyMs / 130));
}

function scoreCostEfficiency(provider: ProviderKey): number {
  // Static ranking — Mistral is cheapest, OpenAI/OpenRouter are equivalent.
  // Only acts as a tiebreaker at ≤15% weight; does not dominate routing.
  const COST_SCORES: Record<ProviderKey, number> = {
    mistral:    80,
    openai:     55,
    openrouter: 50,
  };
  return COST_SCORES[provider];
}

function scoreSchemaReliability(stats: ProviderStats): number {
  if (stats.sampleCount < MIN_SAMPLES) return NEUTRAL_SCORE;
  return Math.max(0, Math.min(100, stats.jsonValidityRate * 100));
}

export function getProviderScore(provider: ProviderKey): ProviderScore {
  const stats = getProviderStats(provider);

  const reliability       = scoreReliability(stats);
  const latency           = scoreLatency(stats);
  const costEfficiency    = scoreCostEfficiency(provider);
  const schemaReliability = scoreSchemaReliability(stats);

  const classes: RequestClass[] = [
    'realtime_critical',
    'structured_evaluation',
    'batch_analysis',
    'lightweight_parse',
  ];

  const compositeByClass = {} as Record<RequestClass, number>;
  for (const cls of classes) {
    const [wR, wL, wC, wS] = SCORE_WEIGHTS[cls];
    compositeByClass[cls] = (
      reliability       * wR +
      latency           * wL +
      costEfficiency    * wC +
      schemaReliability * wS
    );
  }

  return { reliability, latency, costEfficiency, schemaReliability, compositeByClass };
}

// ─── Adaptive routing ─────────────────────────────────────────────────────────

/**
 * Re-ranks a provider list using real-time intelligence scores.
 *
 * Generic over T so callers don't need to import ResolvedProvider — avoids
 * circular dependency with provider-policy.ts.
 *
 * Contract:
 * - T must have `provider: string` and `tier: string`
 * - Fallback-tier providers always stay last (Mistral manages its own retries)
 * - Static ordering is preserved when no provider has ≥ MIN_SAMPLES
 * - Reordering only happens when composite score gap ≥ RERANK_THRESHOLD
 */
export function rankProvidersForRequest<T extends { provider: string; tier: string }>(
  providers: T[],
  operation: string,
): T[] {
  const requestClass = classifyRequest(operation);
  const fallbacks    = providers.filter((p) => p.tier === 'fallback');
  const primaries    = providers.filter((p) => p.tier !== 'fallback');

  if (primaries.length <= 1) return providers;

  // Adaptive routing only activates with sufficient data
  const hasData = primaries.some((p) => {
    const key = p.provider as ProviderKey;
    if (!(key in _windows)) return false;
    pruneWindow(key);
    return _windows[key].length >= MIN_SAMPLES;
  });

  if (!hasData) return providers;

  const scored = primaries.map((p) => ({
    spec:  p,
    score: getProviderScore(p.provider as ProviderKey).compositeByClass[requestClass],
  }));

  const scores    = scored.map((s) => s.score);
  const maxScore  = Math.max(...scores);
  const minScore  = Math.min(...scores);

  // Only reorder when there's a meaningful performance gap
  if (maxScore - minScore < RERANK_THRESHOLD) return providers;

  scored.sort((a, b) => b.score - a.score);

  return [...scored.map((s) => s.spec), ...fallbacks];
}

// ─── Degradation hints ────────────────────────────────────────────────────────

export interface DegradationHint {
  shouldDegrade: boolean;
  reason: string;
  suggestedAction: 'reduce_depth' | 'skip_structured' | 'use_fallback' | 'none';
}

/**
 * Returns a degradation hint based on current provider health.
 * Used by callers to decide whether to simplify the request or skip tiers.
 */
export function getDegradationHint(operation: string): DegradationHint {
  const requestClass = classifyRequest(operation);

  const primaryStats = [getProviderStats('openrouter'), getProviderStats('openai')];
  const avgFailureRate = primaryStats
    .filter((s) => s.sampleCount >= MIN_SAMPLES)
    .reduce((sum, s, _, arr) => sum + s.failureRate / arr.length, 0);

  const avgTimeoutRate = primaryStats
    .filter((s) => s.sampleCount >= MIN_SAMPLES)
    .reduce((sum, s, _, arr) => sum + s.timeoutRate / arr.length, 0);

  // High failure across primary providers → use fallback directly
  if (avgFailureRate > 0.4) {
    return {
      shouldDegrade:   true,
      reason:          `Primary providers averaging ${Math.round(avgFailureRate * 100)}% failure rate`,
      suggestedAction: 'use_fallback',
    };
  }

  // High timeout rate + realtime operation → reduce provider depth
  if (avgTimeoutRate > 0.25 && requestClass === 'realtime_critical') {
    return {
      shouldDegrade:   true,
      reason:          `Timeout rate ${Math.round(avgTimeoutRate * 100)}% too high for realtime operation`,
      suggestedAction: 'reduce_depth',
    };
  }

  // Low JSON validity across all providers + structured operation → warn
  const allProviders: ProviderKey[] = ['openrouter', 'openai', 'mistral'];
  const avgJsonValidity = allProviders
    .map((p) => getProviderStats(p))
    .filter((s) => s.sampleCount >= MIN_SAMPLES)
    .reduce((sum, s, _, arr) => sum + s.jsonValidityRate / arr.length, 1);

  if (avgJsonValidity < 0.85 && requestClass === 'structured_evaluation') {
    return {
      shouldDegrade:   true,
      reason:          `JSON validity ${Math.round(avgJsonValidity * 100)}% below threshold for structured evaluation`,
      suggestedAction: 'skip_structured',
    };
  }

  return { shouldDegrade: false, reason: '', suggestedAction: 'none' };
}

// ─── Observability ────────────────────────────────────────────────────────────

export function getIntelligenceSummary(): IntelligenceSummary {
  const providers: ProviderKey[] = ['openrouter', 'openai', 'mistral'];

  const sampleCounts = {} as Record<ProviderKey, number>;
  const scores       = {} as Record<ProviderKey, ProviderScore | null>;

  for (const p of providers) {
    pruneWindow(p);
    const n = _windows[p].length;
    sampleCounts[p] = n;
    scores[p]       = n >= MIN_SAMPLES ? getProviderScore(p) : null;
  }

  const hasIntelligence = providers.some((p) => sampleCounts[p] >= MIN_SAMPLES);

  return {
    timestamp:             new Date().toISOString(),
    sampleCounts,
    scores,
    totalEstimatedCostUsd: _totalCostUsd,
    routingBasis:          hasIntelligence ? 'intelligence' : 'static',
  };
}

/** Reset all state — intended for testing and cold-start simulation only. */
export function resetIntelligenceState(): void {
  _windows.openrouter = [];
  _windows.openai     = [];
  _windows.mistral    = [];
  _totalCostUsd       = 0;
}
