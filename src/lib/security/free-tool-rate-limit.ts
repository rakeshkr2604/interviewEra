/**
 * Per-tool, per-IP rate limits for marketing free tools.
 * Backed by shared Upstash Redis (`checkRateLimit`) so limits hold across
 * Vercel serverless instances. Policy numbers match the former in-memory limits.
 *
 * ## Failure policy (LLM free tools)
 * All LLM-backed free tools (ATS, Question Generator, QG answer, STAR) MUST call
 * with `failClosed: true`. On Redis errors they return a generic 503-style message
 * (`REDIS_UNAVAILABLE_MESSAGE`) — never raw provider exceptions.
 *
 * Local/dev without Redis configured still fail-open inside `checkRateLimit`
 * (by design for DX). Production must configure Upstash so failClosed is meaningful.
 *
 * Tools may declare an optional `secondary` window (e.g. hourly + daily cap).
 * Windows are checked in order; the first blocked window denies the request.
 */

import { checkRateLimit } from '@/lib/redis/rate-limit';

export type FreeToolId =
  | 'ats-checker'
  | 'question-generator'
  | 'question-generator-answer'
  | 'star-builder'
  | 'prompt-builder';

export type FreeToolRateLimitOptions = {
  /**
   * When true, deny the request if Redis is unavailable.
   * Required `true` for all LLM free-tool call sites (cost / abuse control).
   */
  failClosed: boolean;
};

type WindowPolicy = { limit: number; windowMs: number; userMessage: string };

export const FREE_TOOL_RATE_LIMITS: Record<
  FreeToolId,
  WindowPolicy & { secondary?: WindowPolicy }
> = {
  'ats-checker': {
    limit: 3,
    windowMs: 60 * 60 * 1000,
    userMessage: 'Rate limit reached. You can run up to 3 ATS checks per hour.',
  },
  'question-generator': {
    limit: 5,
    windowMs: 60 * 60 * 1000,
    userMessage: 'Rate limit reached. You can generate up to 5 question sets per hour.',
    secondary: {
      limit: 15,
      windowMs: 24 * 60 * 60 * 1000,
      userMessage: 'Daily limit reached. You can generate up to 15 question sets per day.',
    },
  },
  'question-generator-answer': {
    limit: 30,
    windowMs: 24 * 60 * 60 * 1000,
    userMessage: 'Daily limit reached. You can reveal up to 30 answer guides per day.',
  },
  'star-builder': {
    limit: 5,
    windowMs: 60 * 60 * 1000,
    userMessage: 'Rate limit reached. You can use the STAR builder up to 5 times per hour.',
  },
  'prompt-builder': {
    limit: 40,
    windowMs: 60 * 60 * 1000,
    userMessage: 'Rate limit reached. You can generate up to 40 prompts per hour.',
  },
};

const REDIS_UNAVAILABLE_MESSAGE =
  'Service temporarily unavailable. Please retry in a moment.';

/**
 * If allowed, increments usage for this window. Otherwise returns an error message.
 * Async — callers must await. Pass `failClosed` explicitly per call site.
 */
export async function checkAndConsumeFreeToolLimit(
  toolId: FreeToolId,
  ip: string,
  options: FreeToolRateLimitOptions,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const cfg = FREE_TOOL_RATE_LIMITS[toolId];
  const windows: Array<{ policy: WindowPolicy; keySuffix: string }> = [
    { policy: cfg, keySuffix: '' },
  ];
  if (cfg.secondary) {
    windows.push({ policy: cfg.secondary, keySuffix: ':daily' });
  }

  for (const { policy, keySuffix } of windows) {
    const windowSeconds = Math.max(1, Math.ceil(policy.windowMs / 1000));
    const result = await checkRateLimit(
      `free-tool:${toolId}${keySuffix}:${ip || 'unknown'}`,
      windowSeconds,
      policy.limit,
      { failClosed: options.failClosed },
    );

    if (result.allowed) continue;

    if (result.redisUnavailable) {
      // Only reachable when the caller opted into failClosed.
      return { ok: false, message: REDIS_UNAVAILABLE_MESSAGE };
    }

    return { ok: false, message: `${policy.userMessage} Please wait and try again.` };
  }

  return { ok: true };
}
