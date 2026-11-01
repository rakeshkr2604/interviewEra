/**
 * Fair-use limits for the interactive free preparation tools.
 *
 * Primary key = verified account id (hourly + daily). Secondary per-IP windows use
 * much higher thresholds so a shared college / hostel NAT is not blocked broadly,
 * while one IP cycling many accounts is still capped. All windows are checked and
 * consumed atomically in one Redis script (`checkMultiWindowRateLimit`), so a single
 * operation never double-consumes and concurrent calls cannot overshoot.
 *
 * Free tools NEVER touch mock-interview credits.
 *
 * ## Failure policy
 * LLM-backed tools (ATS, Question Generator, QG answer, STAR) MUST pass
 * `failClosed: true`. Prompt Builder runs locally in the browser and passes false.
 */

import { checkMultiWindowRateLimit, type RateLimitWindow } from '@/lib/redis/rate-limit';

export type FreeToolId =
  | 'ats-checker'
  | 'question-generator'
  | 'question-generator-answer'
  | 'star-builder'
  | 'prompt-builder';

export type FreeToolLimitTier = 'free' | 'paid';

export type FreeToolRateLimitOptions = {
  /** Deny when the abuse-control backend is unavailable. Required `true` for LLM tools. */
  failClosed: boolean;
};

export type FreeToolLimitSubject = {
  userId: string;
  ip: string;
  tier: FreeToolLimitTier;
};

type ToolLimits = { hourly: number; daily: number };

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

/** Approved per-account Free limits. */
export const FREE_TIER_TOOL_LIMITS: Record<FreeToolId, ToolLimits> = {
  'ats-checker': { hourly: 5, daily: 15 },
  'question-generator': { hourly: 5, daily: 15 },
  'question-generator-answer': { hourly: 10, daily: 30 },
  'star-builder': { hourly: 5, daily: 15 },
  'prompt-builder': { hourly: 20, daily: 40 },
};

/**
 * Starter / Pro / campus. Never stricter than the pre-launch per-IP policy
 * (ATS 3/h, QG 5/h + 15/d, QG answer 30/d, STAR 5/h, Prompt 40/h). Where the old
 * policy had no daily cap, daily = hourly × 24 so nothing was silently reduced.
 */
export const PAID_TIER_TOOL_LIMITS: Record<FreeToolId, ToolLimits> = {
  'ats-checker': { hourly: 5, daily: 120 },
  'question-generator': { hourly: 5, daily: 15 },
  'question-generator-answer': { hourly: 30, daily: 30 },
  'star-builder': { hourly: 5, daily: 120 },
  'prompt-builder': { hourly: 40, daily: 960 },
};

/** Secondary per-IP abuse ceiling, deliberately 10× the Free account limits. */
export const IP_ABUSE_TOOL_LIMITS: Record<FreeToolId, ToolLimits> = {
  'ats-checker': { hourly: 50, daily: 150 },
  'question-generator': { hourly: 50, daily: 150 },
  'question-generator-answer': { hourly: 100, daily: 300 },
  'star-builder': { hourly: 50, daily: 150 },
  'prompt-builder': { hourly: 200, daily: 400 },
};

const TOOL_NOUN: Record<FreeToolId, { one: string; many: string }> = {
  'ats-checker': { one: 'ATS check', many: 'ATS checks' },
  'question-generator': { one: 'question set', many: 'question sets' },
  'question-generator-answer': { one: 'answer guide', many: 'answer guides' },
  'star-builder': { one: 'STAR answer', many: 'STAR answers' },
  'prompt-builder': { one: 'prompt', many: 'prompts' },
};

export const RATE_LIMIT_UNAVAILABLE_MESSAGE =
  'This tool is temporarily unavailable. Please retry in a minute.';

export type FreeToolLimitResult =
  | { ok: true }
  | {
      ok: false;
      code: 'RATE_LIMITED' | 'RATE_LIMIT_UNAVAILABLE';
      message: string;
      retryAfterSeconds: number;
    };

export function limitsForTier(toolId: FreeToolId, tier: FreeToolLimitTier): ToolLimits {
  return tier === 'paid' ? PAID_TIER_TOOL_LIMITS[toolId] : FREE_TIER_TOOL_LIMITS[toolId];
}

export function buildFreeToolWindows(
  toolId: FreeToolId,
  subject: FreeToolLimitSubject,
): RateLimitWindow[] {
  const user = limitsForTier(toolId, subject.tier);
  const ipLimits = IP_ABUSE_TOOL_LIMITS[toolId];
  const ip = subject.ip || 'unknown';
  return [
    { key: `free-tool:${toolId}:user:${subject.userId}:hour`, windowSeconds: HOUR, limit: user.hourly },
    { key: `free-tool:${toolId}:user:${subject.userId}:day`, windowSeconds: DAY, limit: user.daily },
    { key: `free-tool:${toolId}:ip:${ip}:hour`, windowSeconds: HOUR, limit: ipLimits.hourly },
    { key: `free-tool:${toolId}:ip:${ip}:day`, windowSeconds: DAY, limit: ipLimits.daily },
  ];
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 90) return 'about a minute';
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 90) return `${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hours`;
}

function limitMessage(toolId: FreeToolId, windowIndex: number, limit: number, retryAfter: number): string {
  const noun = limit === 1 ? TOOL_NOUN[toolId].one : TOOL_NOUN[toolId].many;
  const wait = formatRetryAfter(retryAfter);
  const suffix = 'Free tools never use your mock-interview credits.';
  switch (windowIndex) {
    case 0:
      return `You've used your ${limit} ${noun} for this hour. Try again in ${wait}. ${suffix}`;
    case 1:
      return `You've reached today's fair-use limit of ${limit} ${noun}. Try again in ${wait}. ${suffix}`;
    default:
      return `Too many requests from your network right now. Please try again in ${wait}.`;
  }
}

/** Atomically checks and consumes one unit across every window. */
export async function checkAndConsumeFreeToolLimit(
  toolId: FreeToolId,
  subject: FreeToolLimitSubject,
  options: FreeToolRateLimitOptions,
): Promise<FreeToolLimitResult> {
  const windows = buildFreeToolWindows(toolId, subject);
  const result = await checkMultiWindowRateLimit(windows, { failClosed: options.failClosed });
  if (result.allowed) return { ok: true };

  if (result.redisUnavailable) {
    return {
      ok: false,
      code: 'RATE_LIMIT_UNAVAILABLE',
      message: RATE_LIMIT_UNAVAILABLE_MESSAGE,
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }

  const window = windows[result.blockedIndex];
  return {
    ok: false,
    code: 'RATE_LIMITED',
    message: limitMessage(toolId, result.blockedIndex, window?.limit ?? 0, result.retryAfterSeconds),
    retryAfterSeconds: result.retryAfterSeconds,
  };
}
