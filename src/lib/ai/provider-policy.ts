/**
 * Deterministic, operation-aware provider routing.
 *
 * Callers ask resolveProviders(operation) and receive an ordered list of
 * healthy providers to attempt. Circuit-breaker health (provider-health.ts)
 * is applied at resolution time so unhealthy models are skipped before the
 * first byte is sent to them.
 */

import { isModelHealthy } from '@/lib/ai/provider-health';
import { rankProvidersForRequest } from '@/lib/ai/provider-intelligence';
import { isSingleProviderMode } from '@/lib/ai/single-provider-mode';

export type PolicyOperation =
  | 'answer_evaluation'
  | 'followup_generation'
  | 'agent_analysis'
  | 'question_generation'
  | 'resume_parse'
  | 'report_generation'
  | 'free_tool';

export type ProviderTier = 'quality' | 'fast' | 'fallback';

export interface ResolvedProvider {
  /** Canonical provider name. */
  provider: 'openai' | 'openrouter' | 'mistral';
  /** Exact model ID the provider expects. */
  model: string;
  /** Tier label — callers may use this to decide structured-output eligibility. */
  tier: ProviderTier;
}

/** Internal spec type — same shape, used for the static routing table. */
type ProviderSpec = ResolvedProvider;

/** Health-tracker key — must match keys used in interview-completion.ts. */
function healthKey(spec: ProviderSpec): string {
  return `${spec.provider}:${spec.model}`;
}

/**
 * Ordered provider chains per operation.
 * - quality tier: structured-output capable, higher accuracy
 * - fast tier: cheaper per-token, lower latency
 * - fallback tier: last resort; always included regardless of health (Mistral manages its own retries)
 */
const ROUTING_TABLE: Record<PolicyOperation, ProviderSpec[]> = {
  answer_evaluation: [
    { provider: 'openai',     model: 'gpt-4o-mini',          tier: 'quality'  },
    { provider: 'openrouter', model: 'openai/gpt-4o-mini',   tier: 'fast'     },
    { provider: 'mistral',    model: 'mistral-small-latest', tier: 'fallback' },
  ],
  followup_generation: [
    { provider: 'openrouter', model: 'openai/gpt-4o-mini',   tier: 'fast'     },
    { provider: 'openai',     model: 'gpt-4o-mini',          tier: 'fast'     },
    { provider: 'mistral',    model: 'mistral-small-latest', tier: 'fallback' },
  ],
  agent_analysis: [
    { provider: 'openrouter', model: 'openai/gpt-4o-mini',   tier: 'fast'     },
    { provider: 'openai',     model: 'gpt-4o-mini',          tier: 'fast'     },
    { provider: 'mistral',    model: 'mistral-small-latest', tier: 'fallback' },
  ],
  question_generation: [
    { provider: 'openrouter', model: 'openai/gpt-4o-mini',   tier: 'fast'     },
    { provider: 'openai',     model: 'gpt-4o-mini',          tier: 'fast'     },
    { provider: 'mistral',    model: 'mistral-small-latest', tier: 'fallback' },
  ],
  resume_parse: [
    { provider: 'openrouter', model: 'openai/gpt-4o-mini',   tier: 'fast'     },
    { provider: 'openai',     model: 'gpt-4o-mini',          tier: 'fast'     },
    { provider: 'mistral',    model: 'mistral-small-latest', tier: 'fallback' },
  ],
  report_generation: [
    { provider: 'openai',     model: 'gpt-4o-mini',          tier: 'quality'  },
    { provider: 'openrouter', model: 'openai/gpt-4o-mini',   tier: 'fast'     },
    { provider: 'mistral',    model: 'mistral-small-latest', tier: 'fallback' },
  ],
  free_tool: [
    { provider: 'openrouter', model: 'openai/gpt-4o-mini',   tier: 'fast'     },
    { provider: 'openai',     model: 'gpt-4o-mini',          tier: 'fast'     },
    { provider: 'mistral',    model: 'mistral-small-latest', tier: 'fallback' },
  ],
};

/**
 * Returns the ordered list of healthy providers for the given operation.
 *
 * Step 1 — Circuit breaker filter: unhealthy non-fallback models are removed.
 * Step 2 — Intelligence ranking: if ≥5 samples per provider, adaptive scoring
 *           re-ranks primary providers by class-specific composite score.
 *           Falls back to static order when insufficient data.
 *
 * Mistral (fallback tier) always stays last — it self-manages retries.
 */
export function resolveProviders(operation: PolicyOperation): ResolvedProvider[] {
  const specs  = ROUTING_TABLE[operation] ?? [];
  if (isSingleProviderMode()) {
    return specs.filter((s) => s.provider === 'openrouter').slice(0, 1);
  }
  const healthy = specs.filter(
    (spec) => spec.tier === 'fallback' || isModelHealthy(healthKey(spec)),
  );
  return rankProvidersForRequest(healthy, operation);
}
