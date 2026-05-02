import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_CONSECUTIVE_FAILURES = 5;
const CIRCUIT_RESET_MS = 60_000;
const QUOTA_COOLDOWN_MS = 5 * 60_000; // 5 min — no point retrying quota errors quickly

let consecutiveFailures = 0;
let circuitOpenedAt: number | null = null;
let quotaExhaustedAt: number | null = null;

export class OpenAIUnavailableError extends Error {
  cause: unknown;
  constructor(realError?: unknown) {
    super('AI temporarily unavailable. Try again in 30 seconds.');
    this.name = 'OpenAIUnavailableError';
    this.cause = realError;
  }
}

export class QuotaExhaustedError extends Error {
  constructor() {
    super('OpenAI quota exhausted. Falling back to secondary provider.');
    this.name = 'QuotaExhaustedError';
  }
}

function isCircuitOpen(): boolean {
  if (circuitOpenedAt === null) return false;
  if (Date.now() - circuitOpenedAt >= CIRCUIT_RESET_MS) {
    consecutiveFailures = 0;
    circuitOpenedAt = null;
    return false;
  }
  return true;
}

function isQuotaBlocked(): boolean {
  if (quotaExhaustedAt === null) return false;
  if (Date.now() - quotaExhaustedAt >= QUOTA_COOLDOWN_MS) {
    quotaExhaustedAt = null;
    return false;
  }
  return true;
}

function recordFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    circuitOpenedAt = Date.now();
  }
}

export async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  if (isQuotaBlocked()) {
    console.warn('[openai] Skipping — quota exhausted, cooldown active');
    throw new QuotaExhaustedError();
  }

  if (isCircuitOpen()) {
    throw new OpenAIUnavailableError();
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      consecutiveFailures = 0;
      return result;
    } catch (error) {
      lastError = error;

      const apiError = error instanceof OpenAI.APIError ? error : null;

      if (apiError?.code === 'insufficient_quota') {
        console.warn('[openai] Quota exhausted — blocking further calls for 5 min');
        quotaExhaustedAt = Date.now();
        throw new QuotaExhaustedError();
      }

      const isRetryable = apiError !== null &&
        (apiError.status === 429 || (apiError.status >= 500 && apiError.status < 600));

      if (!isRetryable) {
        console.error('[openai] Non-retryable error:', apiError
          ? `${apiError.status} ${apiError.message}`
          : error);
        recordFailure();
        throw error;
      }

      console.warn(`[openai] Retryable error (attempt ${attempt + 1}/${MAX_RETRIES}):`,
        apiError ? `${apiError.status} ${apiError.message}` : error);

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('[openai] All retries exhausted. Last error:', lastError);
  recordFailure();
  throw lastError;
}

export default openai;
