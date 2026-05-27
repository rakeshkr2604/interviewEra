/**
 * Free-tool chat completions — OpenRouter ONLY (same policy as interview flows).
 */

import OpenAI from 'openai';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import { completionWithRetries, modelPrefersPlainJson, DEFAULT_ATTEMPT_TIMEOUT_MS } from '@/lib/ai/chat-completion-core';
import { getLlmAttemptTimeoutMs } from '@/lib/ai/operation-registry';
import { OPENROUTER_CHEAP_MODEL } from '@/lib/ai/openrouter-model-router';

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

/**
 * @param openrouterModels Ignored — canonical cheap model is always used for tools
 *   (callers may still pass a list for API stability).
 */
export async function completeFreeToolChatChain(options: {
  openrouterModels: string[];
  openaiModels: string[];
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature: number;
}): Promise<string> {
  const { client } = getToolChatClient();
  const model = options.openrouterModels[0]?.trim() || OPENROUTER_CHEAP_MODEL;
  const attemptMs = getLlmAttemptTimeoutMs('free_tool') ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  let lastError: unknown;

  const jsonMode = !modelPrefersPlainJson(model);
  try {
    const { content } = await completionWithRetries(
      client,
      model,
      options.messages,
      options.temperature,
      jsonMode,
      undefined,
      undefined,
      attemptMs,
    );
    return content;
  } catch (e) {
    lastError = e;
    console.warn(`[free-tool-ai] model "${model}" (json_mode=${jsonMode}) failed:`, e instanceof Error ? e.message : e);
  }

  if (jsonMode) {
    try {
      const { content } = await completionWithRetries(
        client,
        model,
        options.messages,
        options.temperature,
        false,
        undefined,
        undefined,
        attemptMs,
      );
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
