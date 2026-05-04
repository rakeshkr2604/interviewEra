/**
 * Free-tool chat completions: OpenRouter when OPENROUTER_API_KEY is set, else direct OpenAI.
 * Does not use shared callWithRetry (avoids global quota lock / circuit breaker).
 */

import OpenAI from 'openai';
import openai from '@/lib/openai/client';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import { completionWithRetries, modelPrefersPlainJson } from '@/lib/ai/chat-completion-core';

export type ToolChatRoute = 'openrouter' | 'openai';

export function getToolChatClient(): { client: OpenAI; route: ToolChatRoute } {
  const or = createOpenRouterClient();
  if (or) return { client: or, route: 'openrouter' };
  return { client: openai, route: 'openai' };
}

export function isFreeToolAiConfigured(): boolean {
  return !!(
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim()
  );
}

export async function completeFreeToolChatChain(options: {
  /** Tried in order when route is openrouter */
  openrouterModels: string[];
  /** Tried in order when route is direct OpenAI */
  openaiModels: string[];
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature: number;
}): Promise<string> {
  const { client, route } = getToolChatClient();
  const models = route === 'openrouter' ? options.openrouterModels : options.openaiModels;
  let lastError: unknown;

  for (const model of models) {
    const jsonMode = !modelPrefersPlainJson(model);
    try {
      return await completionWithRetries(
        client,
        model,
        options.messages,
        options.temperature,
        jsonMode,
      );
    } catch (e) {
      lastError = e;
      console.warn(`[free-tool-ai] [${route}] model "${model}" failed:`, e instanceof Error ? e.message : e);
    }

    if (jsonMode) {
      try {
        return await completionWithRetries(
          client,
          model,
          options.messages,
          options.temperature,
          false,
        );
      } catch (e) {
        lastError = e;
        console.warn(
          `[free-tool-ai] [${route}] model "${model}" (no json_mode) failed:`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All models in chain failed');
}
