/**
 * Centralized AI operation registry — single source of truth for inference policy.
 *
 * Every AI operation in the codebase MUST be declared here. Each entry owns:
 *   - request class (drives provider routing weights + budget limits)
 *   - default sampling temperature
 *   - output token cap (drives max_tokens — prevents OpenRouter context blowout)
 *   - hard operation deadline (outer Promise.race for the whole chain)
 *   - response format expectation (JSON vs plain — feeds response-contract)
 *   - input-context caps (prompt-side payload hygiene)
 *   - estimated input tokens (feeds llm-cost-guard pre-flight check)
 *
 * The registry is intentionally a plain Record — no class hierarchy, no DI
 * container, no orchestration framework. Other modules (token-budget,
 * timeout-policy, inference-router, llm-cost-guard, context-hygiene) read
 * from this map so a single config change propagates everywhere.
 *
 * Adding a new operation:
 *   1. Add the literal to `AiOperation` below.
 *   2. Add an entry to OPERATION_SPECS with all fields populated.
 *   3. (Optional) declare a routing chain in provider-policy.ts if it differs
 *      from the lightweight_parse default.
 */

import type { RequestClass } from '@/lib/ai/provider-intelligence';

// ── Operation names ───────────────────────────────────────────────────────────

export type AiOperation =
  | 'followup_generation'
  | 'agent_analysis'
  | 'answer_evaluation'
  | 'question_generation'
  | 'resume_parse'
  | 'report_generation'
  | 'jd_parse'
  | 'jd_validate'
  | 'document_classify'
  | 'free_tool';

export type AiProvider = 'openrouter' | 'openai' | 'mistral';

export type ResponseFormat = 'json' | 'plain';

// ── Spec shape ────────────────────────────────────────────────────────────────

/**
 * Bounds on the prompt-side payload for an operation.
 * Used by context-hygiene helpers — every operation that takes free-form user
 * input (resume text, JD text, candidate answer, transcript) must declare
 * concrete caps so a 200KB upload never inflates a prompt.
 */
export interface ContextLimits {
  /** Hard cap on the largest single text field injected into the prompt. */
  maxInputChars: number;
  /** Sliding window for multi-turn history. 0 = single-turn operation. */
  maxHistoryTurns: number;
  /** Cap per individual transcript turn when assembling history. */
  maxHistoryTurnChars: number;
}

export interface OperationSpec {
  /** Routing class — drives provider-intelligence scoring weights + budget caps. */
  requestClass: RequestClass;
  /** Default sampling temperature for this operation. */
  temperature: number;
  /** Output token cap (max_tokens). Caller may override for special paths. */
  maxOutputTokens: number;
  /**
   * Per-upstream-request socket budget (completionWithRetries / oneCompletion).
   * Must be ≤ outer timeoutMs. When omitted, chat-completion-core uses its default.
   */
  llmAttemptTimeoutMs?: number;
  /** Hard outer deadline for the entire chain (all retries + fallbacks). */
  timeoutMs: number;
  /** Expected response format — drives response-contract parser selection. */
  responseFormat: ResponseFormat;
  /** Prompt-side payload caps. */
  context: ContextLimits;
  /** Conservative input-token estimate for llm-cost-guard pre-flight check. */
  estimatedInputTokens: number;
}

// ── Registry ──────────────────────────────────────────────────────────────────

/**
 * Operation policy table. Edit values here and they propagate to every caller.
 *
 * Latency budgets (timeoutMs) are sized to fit inside Vercel's 30s function
 * limit even when stacked with auth + DB IO. Realtime ops (followup,
 * agent_analysis) are aggressively short — the candidate is waiting on them.
 *
 * Output token caps were calibrated against historical OpenRouter usage:
 * without max_tokens the model defaults to its full context window (65k for
 * gpt-4o-mini), which can exhaust an entire month of credits in one call.
 */
const OPERATION_SPECS: Record<AiOperation, OperationSpec> = {
  followup_generation: {
    requestClass:         'realtime_critical',
    temperature:          0.8,
    maxOutputTokens:      900,
    llmAttemptTimeoutMs:    9_500,
    timeoutMs:            11_500,
    responseFormat:       'plain',
    context: {
      maxInputChars:        4_000,
      maxHistoryTurns:      6,
      maxHistoryTurnChars:  1_200,
    },
    estimatedInputTokens: 500,
  },
  agent_analysis: {
    requestClass:         'realtime_critical',
    temperature:          0.3,
    maxOutputTokens:      600,
    llmAttemptTimeoutMs:    9_500,
    timeoutMs:            11_500,
    responseFormat:       'json',
    context: {
      maxInputChars:        6_000,
      maxHistoryTurns:      3,
      maxHistoryTurnChars:  600,
    },
    estimatedInputTokens: 500,
  },
  answer_evaluation: {
    requestClass:         'structured_evaluation',
    temperature:          0.3,
    maxOutputTokens:      1_800,
    // Stack under `/api/interview/answer` maxDuration=30 — leave DB + JSON headroom.
    llmAttemptTimeoutMs:    21_500,
    timeoutMs:            26_500,
    responseFormat:       'json',
    context: {
      maxInputChars:        8_000,
      maxHistoryTurns:      0,
      maxHistoryTurnChars:  0,
    },
    estimatedInputTokens: 900,
  },
  question_generation: {
    requestClass:         'lightweight_parse',
    temperature:          0.5,
    maxOutputTokens:      720,
    llmAttemptTimeoutMs:    11_000,
    timeoutMs:            13_000,
    responseFormat:       'json',
    context: {
      maxInputChars:        2_400,
      maxHistoryTurns:      0,
      maxHistoryTurnChars:  0,
    },
    estimatedInputTokens: 450,
  },
  resume_parse: {
    requestClass:         'lightweight_parse',
    temperature:          0,
    maxOutputTokens:      420,
    llmAttemptTimeoutMs:    10_000,
    timeoutMs:            11_000,
    responseFormat:       'json',
    context: {
      maxInputChars:        5_500,
      maxHistoryTurns:      0,
      maxHistoryTurnChars:  0,
    },
    estimatedInputTokens: 350,
  },
  report_generation: {
    requestClass:         'batch_analysis',
    temperature:          0.3,
    maxOutputTokens:      2_200,
    llmAttemptTimeoutMs:    17_500,
    timeoutMs:            22_500,
    responseFormat:       'json',
    context: {
      maxInputChars:        12_000,
      maxHistoryTurns:      0,
      maxHistoryTurnChars:  0,
    },
    estimatedInputTokens: 1_000,
  },
  jd_parse: {
    requestClass:         'lightweight_parse',
    temperature:          0,
    maxOutputTokens:      800,
    llmAttemptTimeoutMs:    10_500,
    timeoutMs:            13_750,
    responseFormat:       'json',
    context: {
      maxInputChars:        12_000,
      maxHistoryTurns:      0,
      maxHistoryTurnChars:  0,
    },
    estimatedInputTokens: 800,
  },
  jd_validate: {
    requestClass:         'lightweight_parse',
    temperature:          0,
    maxOutputTokens:      400,
    llmAttemptTimeoutMs:    6_500,
    timeoutMs:            8_000,
    responseFormat:       'json',
    context: {
      maxInputChars:        12_000,
      maxHistoryTurns:      0,
      maxHistoryTurnChars:  0,
    },
    estimatedInputTokens: 400,
  },
  document_classify: {
    requestClass:         'lightweight_parse',
    temperature:          0,
    maxOutputTokens:      200,
    llmAttemptTimeoutMs:    4_500,
    timeoutMs:            6_000,
    responseFormat:       'json',
    context: {
      maxInputChars:        6_000,
      maxHistoryTurns:      0,
      maxHistoryTurnChars:  0,
    },
    estimatedInputTokens: 300,
  },
  free_tool: {
    requestClass:         'lightweight_parse',
    temperature:          0.5,
    maxOutputTokens:      1_200,
    llmAttemptTimeoutMs:    13_500,
    timeoutMs:            14_750,
    responseFormat:       'json',
    context: {
      maxInputChars:        8_000,
      maxHistoryTurns:      0,
      maxHistoryTurnChars:  0,
    },
    estimatedInputTokens: 600,
  },
};

// ── Accessors ─────────────────────────────────────────────────────────────────

/** Returns the full spec for an operation. Throws if unknown (caller bug). */
export function getOperationSpec(operation: AiOperation): OperationSpec {
  const spec = OPERATION_SPECS[operation];
  if (!spec) {
    throw new Error(
      `[operation-registry] Unknown operation "${operation}" — add it to OPERATION_SPECS`,
    );
  }
  return spec;
}

/** Returns the context limits for an operation. */
export function getContextLimits(operation: AiOperation): ContextLimits {
  return getOperationSpec(operation).context;
}

/** Returns the default temperature for an operation. */
export function getOperationTemperature(operation: AiOperation): number {
  return getOperationSpec(operation).temperature;
}

/** Returns the hard outer deadline (ms) for an operation. */
export function getOperationTimeoutMs(operation: AiOperation): number {
  return getOperationSpec(operation).timeoutMs;
}

/** Per-LLM-HTTP-call timeout ceiling for an operation. */
export function getLlmAttemptTimeoutMs(operation: AiOperation): number | undefined {
  return getOperationSpec(operation).llmAttemptTimeoutMs;
}

/** Returns the expected response format for an operation. */
export function getOperationResponseFormat(operation: AiOperation): ResponseFormat {
  return getOperationSpec(operation).responseFormat;
}

/** Returns the conservative input-token estimate for cost guard pre-flight. */
export function getEstimatedInputTokens(operation: AiOperation): number {
  return getOperationSpec(operation).estimatedInputTokens;
}

/** Lists all known operations — useful for diagnostics endpoints. */
export function listOperations(): readonly AiOperation[] {
  return Object.keys(OPERATION_SPECS) as AiOperation[];
}

/** Diagnostic snapshot — used by /api/admin/system or debug logging. */
export function operationRegistrySnapshot(): Record<AiOperation, OperationSpec> {
  return { ...OPERATION_SPECS };
}
