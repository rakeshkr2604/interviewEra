import OpenAI from 'openai';
import { isSingleProviderMode, FallbackDisabledError } from '@/lib/ai/single-provider-mode';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? '';

const mistral = new OpenAI({
  apiKey: MISTRAL_API_KEY,
  baseURL: 'https://api.mistral.ai/v1',
});

export const MISTRAL_MODEL = 'mistral-small-latest';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MISTRAL_MAX_ATTEMPTS = 2;
const MISTRAL_429_BASE_MS = 2500;
/** Per-attempt hard timeout — prevents a hung Mistral call from eating the serverless slot. */
const MISTRAL_ATTEMPT_TIMEOUT_MS = 12_000;

export async function callMistralChat(
  prompt: string,
  temperature = 0.2,
  maxTokens?: number,
  operationSignal?: AbortSignal,
): Promise<string> {
  if (isSingleProviderMode()) {
    throw new FallbackDisabledError('Mistral');
  }
  if (!MISTRAL_API_KEY) {
    throw new Error('[mistral] API key missing — cannot call Mistral');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MISTRAL_MAX_ATTEMPTS; attempt++) {
    // Bail immediately if the operation-level deadline already fired.
    if (operationSignal?.aborted) {
      console.warn(`[mistral] Attempt ${attempt + 1} skipped — operation aborted`);
      throw new DOMException('Operation aborted before Mistral attempt', 'AbortError');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      console.warn(`[mistral] Attempt ${attempt + 1} timed out (${MISTRAL_ATTEMPT_TIMEOUT_MS}ms)`);
      controller.abort();
    }, MISTRAL_ATTEMPT_TIMEOUT_MS);

    // Bridge: operation-level abort propagates to the per-attempt controller so
    // the underlying fetch stops immediately rather than waiting 12s.
    let opAbortHandler: (() => void) | undefined;
    if (operationSignal) {
      opAbortHandler = () => controller.abort();
      operationSignal.addEventListener('abort', opAbortHandler, { once: true });
    }

    try {
      const response = await mistral.chat.completions.create(
        {
          model: MISTRAL_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          ...(maxTokens != null ? { max_tokens: maxTokens } : {}),
        },
        { signal: controller.signal },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('[mistral] Empty response');
      return content;
    } catch (err) {
      // Operation abort — not a Mistral error, propagate immediately.
      if (operationSignal?.aborted) {
        console.warn(`[mistral] Attempt ${attempt + 1} aborted by operation signal`);
        throw new DOMException('Operation aborted', 'AbortError');
      }

      lastError = err;
      const apiErr = err instanceof OpenAI.APIError ? err : null;
      const is429 = apiErr?.status === 429;
      if (is429 && attempt < MISTRAL_MAX_ATTEMPTS - 1) {
        const wait = MISTRAL_429_BASE_MS * Math.pow(2, attempt);
        console.warn(
          `[mistral] 429 rate limit — waiting ${wait}ms before retry ${attempt + 2}/${MISTRAL_MAX_ATTEMPTS}`,
        );
        // Check abort before sleeping to avoid a useless wait on a dead operation.
        if (operationSignal?.aborted) throw new DOMException('Operation aborted', 'AbortError');
        await sleep(wait);
        continue;
      }
      // Per-attempt timeout — non-retryable; bubble immediately
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`[mistral] Attempt ${attempt + 1} timed out after ${MISTRAL_ATTEMPT_TIMEOUT_MS}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
      if (opAbortHandler && operationSignal) {
        operationSignal.removeEventListener('abort', opAbortHandler);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('[mistral] All retries failed');
}

export default mistral;
