/**
 * Structured AI telemetry events.
 *
 * All events are emitted as single-line JSON to stdout so they can be picked up
 * by log aggregators (Vercel Logs, Datadog, etc.) without additional parsing.
 *
 * Invariants:
 * - All fields are scalar (string | number | boolean) — no nested objects.
 * - No PII: prompts, answers, and names are never included.
 * - The `ts` field (ISO-8601) is always added by emitAiTelemetry().
 */

interface AiTelemetryBase {
  operation: string;
  provider:  string;
  model:     string;
}

export interface AiRequestStartEvent extends AiTelemetryBase {
  event:      'ai_request_start';
  attempt:    number;
  max_tokens: number;
}

export interface AiRequestSuccessEvent extends AiTelemetryBase {
  event:       'ai_request_success';
  attempt:     number;
  latency_ms:  number;
  tokens_used?: number;
}

export interface AiRequestFailureEvent extends AiTelemetryBase {
  event:        'ai_request_failure';
  attempt:      number;
  error_code:   string;
  status_code?: number;
}

export interface AiRequestTimeoutEvent extends AiTelemetryBase {
  event:      'ai_request_timeout';
  attempt:    number;
  timeout_ms: number;
}

export interface AiFallbackTriggeredEvent extends AiTelemetryBase {
  event:         'ai_fallback_triggered';
  from_provider: string;
  to_provider:   string;
  reason:        string;
}

export interface AiBudgetExhaustedEvent extends AiTelemetryBase {
  event:             'ai_budget_exhausted';
  allocated_tokens:  number;
  requested_tokens:  number;
}

export interface AiJsonRepairEvent extends AiTelemetryBase {
  event:           'ai_json_repair';
  fields_repaired: number;
  repair_actions:  string;
}

export interface AiQuotaExhaustedEvent extends AiTelemetryBase {
  event:        'ai_quota_exhausted';
  cooldown_ms:  number;
}

/** Emitted when intelligence-based routing reorders the static provider list. */
export interface AiIntelligenceRoutingEvent {
  event:                  'ai_intelligence_routing';
  operation:              string;
  request_class:          string;
  routing_basis:          'static' | 'intelligence';
  selected_provider:      string;
  score_gap:              number;  // composite score delta between 1st and 2nd provider
  sample_count_openrouter: number;
  sample_count_openai:     number;
  sample_count_mistral:    number;
}

/** Emitted per-call for cost observability — only when token counts are available. */
export interface AiCostEstimateEvent {
  event:                 'ai_cost_estimate';
  operation:             string;
  provider:              string;
  input_tokens:          number;
  output_tokens:         number;
  estimated_cost_usd:    number;
  session_total_cost_usd: number;
}

export type AiTelemetryEvent =
  | AiRequestStartEvent
  | AiRequestSuccessEvent
  | AiRequestFailureEvent
  | AiRequestTimeoutEvent
  | AiFallbackTriggeredEvent
  | AiBudgetExhaustedEvent
  | AiJsonRepairEvent
  | AiQuotaExhaustedEvent
  | AiIntelligenceRoutingEvent
  | AiCostEstimateEvent;

/**
 * Emits a structured telemetry event to stdout as a single JSON line.
 * The `ts` (ISO-8601 timestamp) field is injected automatically.
 */
export function emitAiTelemetry(event: AiTelemetryEvent): void {
  const payload = { ts: new Date().toISOString(), ...event };
  console.log(JSON.stringify(payload));
}
