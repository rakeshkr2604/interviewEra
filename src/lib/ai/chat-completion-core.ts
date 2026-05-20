/**
 * Shared chat completion retries for OpenRouter-compatible clients (no global OpenAI quota lock).
 * Each attempt is guarded by a 15s AbortSignal so a hung upstream never blocks the serverless slot.
 */

import OpenAI from 'openai';

const COMPLETION_RETRIES = 1;
const RETRY_BASE_MS = 900;
/**
 * Hard per-attempt deadline — prevents a single hung LLM call from eating the
 * 30s route budget. Sized to absorb p99 OpenRouter latency for our largest
 * operations (resume_parse, question_generation): observed steady-state is
 * ~10s, so 18s gives 80% headroom without consuming the full route slot.
 */
const ATTEMPT_TIMEOUT_MS = 18_000;

export function modelPrefersPlainJson(model: string): boolean {
  return /gpt-3\.5|gemini|llama|mistral|qwen/i.test(model);
}

async function oneCompletion(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  temperature: number,
  jsonObject: boolean,
  maxTokens?: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

  try {
    const res = await client.chat.completions.create(
      {
        model,
        messages,
        temperature,
        ...(maxTokens != null ? { max_tokens: maxTokens } : {}),
        ...(jsonObject ? { response_format: { type: 'json_object' as const } } : {}),
      },
      { signal: controller.signal },
    );
    const content = res.choices[0]?.message?.content;
    if (content == null || typeof content !== 'string' || !content.trim()) {
      throw new Error('Empty completion from model');
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function completionWithRetries(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  temperature: number,
  jsonObject: boolean,
  maxTokens?: number,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < COMPLETION_RETRIES; attempt++) {
    try {
      return await oneCompletion(client, model, messages, temperature, jsonObject, maxTokens);
    } catch (error) {
      lastError = error;
      const api = error instanceof OpenAI.APIError ? error : null;

      // Quota exhaustion: propagate immediately — caller decides provider switch
      if (api?.code === 'insufficient_quota') throw error;

      // Abort = timeout: non-retryable for this attempt set
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.warn(`[chat-completion-core] Attempt ${attempt + 1} timed out (${ATTEMPT_TIMEOUT_MS}ms) — model: ${model}`);
        throw new Error(`Completion timeout after ${ATTEMPT_TIMEOUT_MS}ms`);
      }

      // 400/401/403: deterministic model failure — no point retrying
      const hardFail = api !== null && api.status != null &&
        (api.status === 400 || api.status === 401 || api.status === 403);
      if (hardFail) throw error;

      const retryable =
        api !== null &&
        (api.status === 429 || (api.status != null && api.status >= 500 && api.status < 600));

      if (!retryable || attempt >= COMPLETION_RETRIES - 1) throw error;

      const delay = RETRY_BASE_MS * 2 ** attempt;
      console.warn(
        `[chat-completion-core] Retryable error (attempt ${attempt + 1}/${COMPLETION_RETRIES}), waiting ${delay}ms — model: ${model}`,
        api ? `HTTP ${api.status}` : error,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Completion failed');
}
