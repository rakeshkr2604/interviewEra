/**
 * Per-tool, per-IP rate limits for marketing free tools.
 * Backed by shared Upstash Redis (`checkRateLimit`) so limits hold across
 * Vercel serverless instances. Policy numbers match the former in-memory limits.
 *
 * Fail-closed vs fail-open on Redis outage is chosen by each caller via options
 * (not hardcoded by tool id) so expensive tools can opt in without taking down
 * cheaper lead-gen tools during a Redis blip.
 */

import { checkRateLimit } from '@/lib/redis/rate-limit';

export type FreeToolId = 'ats-checker' | 'question-generator' | 'star-builder';

export type FreeToolRateLimitOptions = {
  /**
   * When true, deny the request if Redis is unavailable.
   * Callers for expensive tools (e.g. ATS) should pass true; cheaper tools
   * should pass false so a Redis outage does not kill availability.
   */
  failClosed: boolean;
};

export const FREE_TOOL_RATE_LIMITS: Record<
  FreeToolId,
  { limit: number; windowMs: number; userMessage: string }
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
  },
  'star-builder': {
    limit: 5,
    windowMs: 60 * 60 * 1000,
    userMessage: 'Rate limit reached. You can use the STAR builder up to 5 times per hour.',
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
  const windowSeconds = Math.max(1, Math.ceil(cfg.windowMs / 1000));
  const result = await checkRateLimit(
    `free-tool:${toolId}:${ip || 'unknown'}`,
    windowSeconds,
    cfg.limit,
    { failClosed: options.failClosed },
  );

  if (result.allowed) return { ok: true };

  if (result.redisUnavailable) {
    // Only reachable when the caller opted into failClosed.
    return { ok: false, message: REDIS_UNAVAILABLE_MESSAGE };
  }

  return { ok: false, message: `${cfg.userMessage} Please wait and try again.` };
}
