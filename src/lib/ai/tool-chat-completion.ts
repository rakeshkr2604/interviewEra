/**
 * Free-tool chat completions — OpenRouter ONLY (same policy as interview flows).
 *
 * Every completion issued through this module is logged to `ai_call_logs`
 * (fire-and-forget via logAICall) so free-tool LLM spend is visible in the
 * admin dashboard alongside interview operations. Blast-radius note: logging
 * lives HERE, not in chat-completion-core.ts / interview-completion.ts.
 */

import OpenAI from 'openai';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import { completionWithRetries, modelPrefersPlainJson, DEFAULT_ATTEMPT_TIMEOUT_MS } from '@/lib/ai/chat-completion-core';
import type { CompletionWithMeta } from '@/lib/ai/chat-completion-core';
import { getLlmAttemptTimeoutMs } from '@/lib/ai/operation-registry';
import { OPENROUTER_CHEAP_MODEL } from '@/lib/ai/openrouter-model-router';
import { logAICall } from '@/lib/telemetry/ai-logger';

export type ToolChatRoute = 'openrouter';

export function getToolChatClient(): { client: OpenAI; route: ToolChatRoute } {
  const or = createOpenRouterClient();
  if (!or) {
    throw new Error('[free-tool-ai] OpenRouter is not configured (OPENROUTER_API_KEY missing)');
  }
  return { client: or, route: 'openrouter' };
}

export function isFreeToolAiConfigured(): boolean {
  return !!(process.env.OPENROUTER_API_KEY?.trim());
}

function toErrorCategory(err: unknown): 'timeout' | 'quota' | 'http_error' {
  if (err instanceof OpenAI.APIError) {
    if (err.code === 'insufficient_quota' || err.status === 402 || err.status === 429) {
      return 'quota';
    }
    return 'http_error';
  }
  if (err instanceof Error && /timeout|abort/i.test(err.message)) return 'timeout';
  return 'http_error';
}

/**
 * `completionWithRetries` + fire-and-forget `ai_call_logs` row per attempt.
 * Single logging entry point for all free-tool LLM calls (ATS + STAR).
 */
export async function completeToolCompletionLogged(options: {
  client: OpenAI;
  model: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature: number;
  jsonMode: boolean;
  attemptTimeoutMs: number;
  /** ai_call_logs.operation label, e.g. 'ats_field_extraction' | 'star_builder'. */
  operation: string;
}): Promise<CompletionWithMeta> {
  const t0 = Date.now();
  try {
    const result = await completionWithRetries(
      options.client,
      options.model,
      options.messages,
      options.temperature,
      options.jsonMode,
      undefined,
      undefined,
      options.attemptTimeoutMs,
    );
    void logAICall({
      operation: options.operation,
      provider: 'openrouter',
      model: options.model,
      input_tokens: result.usage?.prompt_tokens,
      output_tokens: result.usage?.completion_tokens,
      latency_ms: Date.now() - t0,
      success: true,
    });
    return result;
  } catch (err) {
    void logAICall({
      operation: options.operation,
      provider: 'openrouter',
      model: options.model,
      latency_ms: Date.now() - t0,
      success: false,
      error_category: toErrorCategory(err),
      error_code: err instanceof OpenAI.APIError && err.status != null ? String(err.status) : undefined,
    });
    throw err;
  }
}

/**
 * @param openrouterModels Ignored — canonical cheap model is always used for tools
 *   (callers may still pass a list for API stability).
 */
export async function completeFreeToolChatChain(options: {
  openrouterModels: string[];
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature: number;
  /** ai_call_logs.operation label; defaults to 'free_tool'. */
  operation?: string;
}): Promise<string> {
  const { client } = getToolChatClient();
  const model = options.openrouterModels[0]?.trim() || OPENROUTER_CHEAP_MODEL;
  const attemptMs = getLlmAttemptTimeoutMs('free_tool') ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  const operation = options.operation ?? 'free_tool';
  let lastError: unknown;

  const jsonMode = !modelPrefersPlainJson(model);
  try {
    const { content } = await completeToolCompletionLogged({
      client,
      model,
      messages: options.messages,
      temperature: options.temperature,
      jsonMode,
      attemptTimeoutMs: attemptMs,
      operation,
    });
    return content;
  } catch (e) {
    lastError = e;
    console.warn(`[free-tool-ai] model "${model}" (json_mode=${jsonMode}) failed:`, e instanceof Error ? e.message : e);
  }

  if (jsonMode) {
    try {
      const { content } = await completeToolCompletionLogged({
        client,
        model,
        messages: options.messages,
        temperature: options.temperature,
        jsonMode: false,
        attemptTimeoutMs: attemptMs,
        operation,
      });
      return content;
    } catch (e) {
      lastError = e;
      console.warn(
        `[free-tool-ai] model "${model}" (plain) failed:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All models in chain failed');
}
