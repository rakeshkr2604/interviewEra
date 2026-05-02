import OpenAI from 'openai';

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * OpenAI SDK pointed at OpenRouter (chat completions compatible).
 * @see https://openrouter.ai/docs
 */
export function createOpenRouterClient(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://interviewera.com';

  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': referer,
      'X-Title': process.env.OPENROUTER_APP_TITLE?.trim() || 'InterviewEra',
    },
  });
}

export function isOpenRouterConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY?.trim();
}
