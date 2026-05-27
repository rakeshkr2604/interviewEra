/**
 * Inference router — single entry point for operation-aware chat completions.
 *
 * Goal: callers describe WHAT they want to do (operation name) rather than
 * HOW (which model, which timeout, which token cap, which retry policy).
 * The router pulls the canonical policy from operation-registry and threads
 * it through the existing primary chain (completeInterviewChat) + Mistral
 * fallback, wrapped in the operation's hard deadline.
 *
 * This is intentionally a THIN facade — it composes existing pieces rather
 * than replacing them. Callers can adopt it incrementally; pre-existing
 * direct uses of completeInterviewChat continue to work unchanged.
 *
 * What this router does NOT do:
 *   - It does not parse JSON (use response-contract).
 *   - It does not clamp input (use context-hygiene at the call site).
 *   - It does not validate response schemas (use Zod via response-contract).
 *   - It does not implement adaptive routing (provider-policy handles that).
 *
 * Why those are excluded: each caller has slightly different parse/validate
 * needs (self-healing coercion in evaluate-answer, simple shape check in
 * parse-resume, etc.), and forcing one strategy through this router would
 * break the principle "preserve existing product behavior."
 */

import type OpenAI from 'openai';
import { completeInterviewChat, type InterviewAiChatProvider } from '@/lib/ai/interview-completion';
import { callMistralChat } from '@/lib/mistral/client';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import {
  getOperationSpec,
  type AiOperation,
} from '@/lib/ai/operation-registry';
import { isSingleProviderMode } from '@/lib/ai/single-provider-mode';
import { emitAiTelemetry } from '@/lib/observability/ai-telemetry';
import { logProviderFailover } from '@/lib/telemetry/ai-logger';

export type RoutedProvider = InterviewAiChatProvider | 'mistral';

export interface RouteInferenceOptions {
  /** Operation key — drives temp/tokens/timeout/format from the registry. */
  operation: AiOperation;
  /** Full message stack. Caller is responsible for context-hygiene clamping. */
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  /** Override default temperature for this call (rare — prefer registry). */
  temperatureOverride?: number;
  /** Override default max output tokens (rare — prefer registry). */
  maxTokensOverride?: number;
  /**
   * When true, allow Mistral fallback after the primary chain fails.
   * Defaults to true. Set false for operations that have structured-output
   * paths handled by the caller (e.g. evaluate-answer's structured OpenAI tier).
   */
  enableMistralFallback?: boolean;
}

export interface RoutedCompletion {
  content: string;
  provider: RoutedProvider;
  /** Wall-clock duration for the resolved chain (including fallbacks). */
  latencyMs: number;
}

/**
 * Run an inference call using the operation's registered policy.
 *
 * Behaviour:
 *   1. Wraps the entire call (incl. fallbacks) in the op's hard deadline.
 *   2. Tries the primary chain via completeInterviewChat — which itself
 *      handles OpenRouter → OpenAI routing + circuit breaker + budget.
 *   3. On failure, falls back to Mistral (if enabled and not in single-
 *      provider mode), with a single retry inside callMistralChat.
 *   4. Emits structured failover telemetry when crossing providers.
 *
 * Throws when every provider in the chain fails OR when the outer deadline
 * fires.
 */
export async function routeInference(
  options: RouteInferenceOptions,
): Promise<RoutedCompletion> {
  const spec = getOperationSpec(options.operation);
  const temperature  = options.temperatureOverride ?? spec.temperature;
  const maxTokens    = options.maxTokensOverride   ?? spec.maxOutputTokens;
  const allowMistral = options.enableMistralFallback ?? true;
  const wantJson     = spec.responseFormat === 'json';

  return withOperationDeadline(options.operation, async () => {
    const started = Date.now();
    try {
      const { content, provider } = await completeInterviewChat({
        messages:    options.messages,
        temperature,
        maxTokens,
        operation:   options.operation,
        jsonMode:    wantJson,
      });
      return { content, provider, latencyMs: Date.now() - started };
    } catch (primaryError) {
      if (!allowMistral || isSingleProviderMode()) throw primaryError;

      console.warn(
        `[inference-router] Primary chain failed for "${options.operation}", trying Mistral:`,
        primaryError instanceof Error ? primaryError.message : primaryError,
      );
      emitAiTelemetry({
        event:         'ai_fallback_triggered',
        operation:     options.operation,
        provider:      'mistral',
        model:         'mistral-small-latest',
        from_provider: 'openrouter',
        to_provider:   'mistral',
        reason:        'primary_chain_failure',
      });
      void logProviderFailover({
        operation:     options.operation,
        from_provider: 'openrouter',
        from_model:    'openai/gpt-4o-mini',
        to_provider:   'mistral',
        to_model:      'mistral-small-latest',
        reason:        'primary_chain_failure',
      });

      // Mistral takes a single concatenated prompt — flatten the message stack
      // preserving role labels so the model still sees system / user separation.
      const flattened = options.messages
        .map((m) => {
          const role = m.role.toUpperCase();
          const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
          return `[${role}]\n${text}`;
        })
        .join('\n\n');

      const mistralStarted = Date.now();
      const content = await callMistralChat(flattened, temperature, maxTokens);
      return {
        content,
        provider:  'mistral',
        latencyMs: Date.now() - mistralStarted,
      };
    }
  });
}
