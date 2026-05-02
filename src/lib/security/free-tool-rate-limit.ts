/**
 * Per-tool, per-IP rate limits for marketing free tools (in-memory, per server process).
 * For multi-instance production, replace with Redis / Vercel KV.
 */

export type FreeToolId = 'ats-checker' | 'question-generator' | 'star-builder';

const store = new Map<string, { count: number; resetAt: number }>();

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

function storeKey(toolId: FreeToolId, ip: string): string {
  return `${toolId}:${ip}`;
}

/**
 * If allowed, increments usage for this window. Otherwise returns an error message.
 */
export function checkAndConsumeFreeToolLimit(
  toolId: FreeToolId,
  ip: string,
): { ok: true } | { ok: false; message: string } {
  const cfg = FREE_TOOL_RATE_LIMITS[toolId];
  const key = storeKey(toolId, ip);
  const now = Date.now();
  const rl = store.get(key);

  if (rl) {
    if (now < rl.resetAt) {
      if (rl.count >= cfg.limit) {
        return { ok: false, message: `${cfg.userMessage} Please wait and try again.` };
      }
      store.set(key, { count: rl.count + 1, resetAt: rl.resetAt });
    } else {
      store.set(key, { count: 1, resetAt: now + cfg.windowMs });
    }
  } else {
    store.set(key, { count: 1, resetAt: now + cfg.windowMs });
  }

  return { ok: true };
}
