/**
 * Free-tool chat completions: OpenRouter when OPENROUTER_API_KEY is set, else direct OpenAI.
 * Does not use shared callWithRetry (avoids global quota lock / circuit breaker).
 */

import OpenAI from 'openai';
import openai from '@/lib/openai/client';
import { createOpenRouterClient } from '@/lib/openrouter/client';

export type ToolChatRoute = 'openrouter' | 'openai';

const COMPLETION_RETRIES = 3;
const RETRY_BASE_MS = 900;

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

function modelPrefersPlainJson(model: string): boolean {
  return /gpt-3\.5|gemini|llama|mistral|qwen/i.test(model);
}

async function oneCompletion(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  temperature: number,
  jsonObject: boolean,
): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    messages,
    temperature,
    ...(jsonObject ? { response_format: { type: 'json_object' as const } } : {}),
  });
  const content = res.choices[0]?.message?.content;
  if (content == null || typeof content !== 'string' || !content.trim()) {
    throw new Error('Empty completion from model');
  }
  return content;
}

async function completionWithRetries(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  temperature: number,
  jsonObject: boolean,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < COMPLETION_RETRIES; attempt++) {
    try {
      return await oneCompletion(client, model, messages, temperature, jsonObject);
    } catch (error) {
      lastError = error;
      const api = error instanceof OpenAI.APIError ? error : null;

      if (api?.code === 'insufficient_quota') {
        throw error;
      }

      const retryable =
        api !== null &&
        (api.status === 429 || (api.status != null && api.status >= 500 && api.status < 600));

      if (!retryable || attempt >= COMPLETION_RETRIES - 1) {
        throw error;
      }

      const delay = RETRY_BASE_MS * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Completion failed');
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
