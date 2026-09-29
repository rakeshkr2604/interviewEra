/**
 * Central AI call telemetry logger.
 *
 * All writes are fire-and-forget (void) — they NEVER block the AI response path.
 * Failures are logged to console but do not surface to the user.
 *
 * Integration points (verified from codebase):
 * - evaluate-answer.ts: calls recordProviderOutcome() after each tier attempt
 * - generate-questions.ts: calls completeInterviewChat()
 * - interview completion / script scoring paths call completeInterviewChat()
 * - parse-resume.ts: calls completeInterviewChat()
 *
 * Usage: call logAICall() right after each provider attempt resolves.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { calculateLLMCost } from '@/lib/cost/cost-engine';
import type { LLMProvider } from '@/lib/cost/cost-engine';

export interface AICallLogEntry {
  user_id?: string;
  interview_id?: string;
  operation: string;
  provider: LLMProvider;
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;            // pass if pre-computed; otherwise derived from tokens
  latency_ms: number;
  retries?: number;
  success: boolean;
  is_fallback?: boolean;        // true if not the first-choice provider for this operation
  error_category?: 'timeout' | 'quota' | 'parse_failure' | 'http_error' | 'circuit_open' | 'budget_exceeded';
  error_code?: string;
  json_parse_ok?: boolean;
  circuit_was_open?: boolean;
  ip?: string;
  user_agent?: string;
  session_id?: string;
}

export interface ProviderFailoverEntry {
  user_id?: string;
  interview_id?: string;
  operation: string;
  from_provider: string;
  from_model: string;
  to_provider: string;
  to_model: string;
  reason: string;
  latency_before_ms?: number;
}

/**
 * Persist a single AI call event to ai_call_logs.
 * Fire-and-forget — call with `void logAICall(...)`.
 */
export async function logAICall(entry: AICallLogEntry): Promise<void> {
  try {
    const cost_usd = entry.cost_usd ??
      (entry.input_tokens != null && entry.output_tokens != null
        ? calculateLLMCost(entry.provider, entry.model, entry.input_tokens, entry.output_tokens)
        : undefined);

    const serviceClient = createServiceClient();
    const { error } = await serviceClient.from('ai_call_logs').insert({
      user_id:         entry.user_id ?? null,
      interview_id:    entry.interview_id ?? null,
      operation:       entry.operation,
      provider:        entry.provider,
      model:           entry.model,
      input_tokens:    entry.input_tokens ?? null,
      output_tokens:   entry.output_tokens ?? null,
      cost_usd:        cost_usd ?? null,
      latency_ms:      entry.latency_ms,
      retries:         entry.retries ?? 0,
      success:         entry.success,
      is_fallback:     entry.is_fallback ?? false,
      error_category:  entry.error_category ?? null,
      error_code:      entry.error_code ?? null,
      json_parse_ok:   entry.json_parse_ok ?? null,
      circuit_was_open: entry.circuit_was_open ?? false,
      ip:              entry.ip ?? null,
      user_agent:      entry.user_agent ?? null,
      session_id:      entry.session_id ?? null,
    });

    if (error) {
      // Non-fatal: telemetry failure must not disrupt interviews
      console.error('[ai-logger] Insert failed:', error.message);
    }
  } catch (err) {
    console.error('[ai-logger] Unexpected error:', err);
  }
}

/**
 * Persist a provider failover event.
 * Fire-and-forget — call with `void logProviderFailover(...)`.
 */
export async function logProviderFailover(entry: ProviderFailoverEntry): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    await serviceClient.from('provider_failover_events').insert({
      user_id:           entry.user_id ?? null,
      interview_id:      entry.interview_id ?? null,
      operation:         entry.operation,
      from_provider:     entry.from_provider,
      from_model:        entry.from_model,
      to_provider:       entry.to_provider,
      to_model:          entry.to_model,
      reason:            entry.reason,
      latency_before_ms: entry.latency_before_ms ?? null,
    });
  } catch (err) {
    console.error('[ai-logger] Failover log failed:', err);
  }
}

/**
 * Snapshot current provider health to provider_health_logs.
 * Call from a /api/cron/health-snapshot route on a schedule (e.g. hourly).
 */
export async function logProviderHealthSnapshot(
  provider: string,
  model: string,
  stats: {
    success_rate: number;
    p95_latency_ms: number;
    avg_latency_ms: number;
    json_validity_rate: number;
    timeout_rate: number;
    quota_rate: number;
    sample_count: number;
    circuit_open: boolean;
    total_cost_usd: number;
  },
): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    await serviceClient.from('provider_health_logs').insert({
      provider,
      model,
      ...stats,
    });
  } catch (err) {
    console.error('[ai-logger] Health snapshot failed:', err);
  }
}
