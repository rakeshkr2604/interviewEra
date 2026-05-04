/**
 * Shared chat completion retries for OpenRouter-compatible clients (no global OpenAI quota lock).
 */

import OpenAI from 'openai';

const COMPLETION_RETRIES = 3;
const RETRY_BASE_MS = 900;

export function modelPrefersPlainJson(model: string): boolean {
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

export async function completionWithRetries(
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
