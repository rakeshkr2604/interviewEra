/**
 * OpenRouter-compatible chat completions — per-attempt socket budget + light retry.
 */

import OpenAI from 'openai';

const COMPLETION_RETRIES = 1;
const RETRY_BASE_MS = 900;
/** When an operation does not set `llmAttemptTimeoutMs` in the registry. */
export const DEFAULT_ATTEMPT_TIMEOUT_MS = 20_000;

export interface CompletionWithMeta {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export function modelPrefersPlainJson(model: string): boolean {
  return /gpt-3\.5|gemini|llama|mistral|qwen/i.test(model);
}

async function oneCompletion(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  temperature: number,
  jsonObject: boolean,
  maxTokens: number | undefined,
  attemptTimeoutMs: number,
  operationSignal?: AbortSignal,
): Promise<CompletionWithMeta> {
  if (operationSignal?.aborted) {
    throw new DOMException('Operation aborted before attempt', 'AbortError');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), attemptTimeoutMs);

  let opAbortHandler: (() => void) | undefined;
  if (operationSignal) {
    opAbortHandler = () => controller.abort();
    operationSignal.addEventListener('abort', opAbortHandler, { once: true });
  }

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
    return { content, usage: res.usage ?? undefined };
  } finally {
    clearTimeout(timer);
    if (opAbortHandler && operationSignal) {
      operationSignal.removeEventListener('abort', opAbortHandler);
    }
  }
}

export async function completionWithRetries(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  temperature: number,
  jsonObject: boolean,
  maxTokens: number | undefined,
  operationSignal: AbortSignal | undefined,
  attemptTimeoutMs: number,
): Promise<CompletionWithMeta> {
  let lastError: unknown;

  for (let attempt = 0; attempt < COMPLETION_RETRIES; attempt++) {
    if (operationSignal?.aborted) {
      console.warn(
        `[chat-completion-core] Attempt ${attempt + 1} skipped — operation aborted — model: ${model}`,
      );
      throw new DOMException('Operation aborted before retry', 'AbortError');
    }
    try {
      return await oneCompletion(
        client,
        model,
        messages,
        temperature,
        jsonObject,
        maxTokens,
        attemptTimeoutMs,
        operationSignal,
      );
    } catch (error) {
      if (operationSignal?.aborted) {
        console.warn(
          `[chat-completion-core] Attempt ${attempt + 1} aborted by operation signal — model: ${model}`,
        );
        throw new DOMException('Operation aborted', 'AbortError');
      }

      lastError = error;
      const api = error instanceof OpenAI.APIError ? error : null;

      if (api?.code === 'insufficient_quota') throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        console.warn(
          `[chat-completion-core] Attempt ${attempt + 1} timed out (${attemptTimeoutMs}ms) — model: ${model}`,
        );
        throw new Error(`Completion timeout after ${attemptTimeoutMs}ms`);
      }

      const hardFail =
        api !== null &&
        api.status != null &&
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
