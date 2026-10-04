/**
 * Abuse controls for campus bulk-invite Resend paths.
 *
 * Independent of proxy limits. Policy (Redis configured):
 * - Per-user request window (fail-closed)
 * - Per-org recipient budget via rate-limit `cost` (fail-closed)
 * - Per-org send lock to bound concurrent blasts (fail-closed on Redis errors)
 * - Redis unconfigured (local DX): allow — same as checkRateLimit
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import getRedis, { isRedisConfigured } from '@/lib/redis/client';
import {
  buildRateLimitHttpResponse,
  checkRateLimit,
} from '@/lib/redis/rate-limit';

/** Existing product Zod ceiling — keep; do not invent a lower entitlement. */
export const BULK_INVITE_MAX_RECIPIENTS = 500;

/** Max bulk-invite HTTP requests per user per hour. */
export const BULK_INVITE_REQ_LIMIT = 10;
export const BULK_INVITE_REQ_WINDOW_SEC = 3600;

/** Max new invitation emails per org per hour (charged after skip/dedupe). */
export const BULK_INVITE_RECIPIENT_LIMIT = 500;
export const BULK_INVITE_RECIPIENT_WINDOW_SEC = 3600;

/** Max concurrent bulk-send jobs per org. */
export const BULK_INVITE_LOCK_TTL_SEC = 180;

export const bulkInviteBodySchema = z.object({
  emails: z
    .array(z.string().trim().email().max(320))
    .min(1)
    .max(BULK_INVITE_MAX_RECIPIENTS),
  source: z.enum(['manual', 'csv']).optional(),
});

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalize + dedupe emails (lowercase, trim). Preserves first-seen order.
 */
export function normalizeBulkInviteEmails(emails: string[]): {
  unique: string[];
  duplicateCount: number;
} {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    unique.push(email);
  }
  return { unique, duplicateCount: emails.length - unique.length };
}

function rlResponse(
  rl: Awaited<ReturnType<typeof checkRateLimit>>,
  tooManyMessage: string,
): NextResponse | null {
  const blocked = buildRateLimitHttpResponse(rl, tooManyMessage);
  if (!blocked) return null;
  return NextResponse.json(blocked.body, {
    status: blocked.status,
    headers: blocked.headers,
  });
}

/**
 * Per-user request rate (before expensive DB / Resend work).
 */
export async function enforceBulkInviteRequestRateLimit(
  userId: string,
): Promise<NextResponse | null> {
  const rl = await checkRateLimit(
    `bulk_invite:req:${userId}`,
    BULK_INVITE_REQ_WINDOW_SEC,
    BULK_INVITE_REQ_LIMIT,
    { failClosed: true },
  );
  return rlResponse(
    rl,
    'Too many invitation requests. Please wait and try again.',
  );
}

/**
 * Per-org recipient budget. `recipientCount` must be the count that will hit Resend.
 * Atomic INCRBY of the full batch (checkRateLimit clamps cost at 100 — too small for CSV).
 */
export async function enforceBulkInviteRecipientBudget(
  orgId: string,
  recipientCount: number,
): Promise<NextResponse | null> {
  const n = Math.max(0, Math.floor(recipientCount));
  if (n === 0) return null;

  if (!isRedisConfigured()) {
    return null;
  }

  const windowSeconds = BULK_INVITE_RECIPIENT_WINDOW_SEC;
  const maxRecipients = BULK_INVITE_RECIPIENT_LIMIT;
  const windowSlot = Math.floor(Date.now() / (windowSeconds * 1000));
  const redisKey = `rl:bulk_invite:recipients:${orgId}:${windowSlot}`;
  const resetInSeconds = windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);

  try {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    pipeline.incrby(redisKey, n);
    pipeline.expire(redisKey, windowSeconds * 2);
    const [countRaw] = await pipeline.exec<[number, number]>();
    const count = typeof countRaw === 'number' ? countRaw : Number(countRaw) || 0;

    if (count > maxRecipients) {
      try {
        await redis.incrby(redisKey, -n);
      } catch (rollbackErr) {
        console.error('[bulk-invite] recipient budget rollback failed:', rollbackErr);
      }
      console.warn(
        JSON.stringify({
          event: 'bulk_invite_recipient_budget_exceeded',
          org_id: orgId,
          attempted: n,
          limit: maxRecipients,
        }),
      );
      return NextResponse.json(
        {
          error: 'Invitation send limit reached for this organization. Please wait and try again.',
          code: 'bulk_invite_recipient_limit',
        },
        { status: 429, headers: { 'Retry-After': String(resetInSeconds) } },
      );
    }

    return null;
  } catch (err) {
    console.error('[bulk-invite] recipient budget Redis error, failing closed:', err);
    return NextResponse.json(
      {
        error: 'Service temporarily unavailable. Please retry in a moment.',
        code: 'rate_limit_backend_unavailable',
      },
      { status: 503, headers: { 'Retry-After': String(resetInSeconds) } },
    );
  }
}

/** Best-effort refund when invites were never inserted / sent after a budget charge. */
export async function releaseBulkInviteRecipientBudget(
  orgId: string,
  recipientCount: number,
): Promise<void> {
  const n = Math.max(0, Math.floor(recipientCount));
  if (n === 0 || !isRedisConfigured()) return;
  const windowSeconds = BULK_INVITE_RECIPIENT_WINDOW_SEC;
  const windowSlot = Math.floor(Date.now() / (windowSeconds * 1000));
  const redisKey = `rl:bulk_invite:recipients:${orgId}:${windowSlot}`;
  try {
    await getRedis().incrby(redisKey, -n);
  } catch (err) {
    console.error('[bulk-invite] recipient budget release failed (non-fatal):', err);
  }
}

export type BulkInviteOrgLock = {
  release: () => Promise<void>;
};

/**
 * Bound concurrent bulk sends per org. Fail-closed when Redis errors.
 * Unconfigured Redis: no-op lock (local DX).
 */
export async function acquireBulkInviteOrgLock(
  orgId: string,
): Promise<{ ok: true; lock: BulkInviteOrgLock } | { ok: false; response: NextResponse }> {
  if (!isRedisConfigured()) {
    return { ok: true, lock: { release: async () => undefined } };
  }

  const key = `bulk_invite:lock:org:${orgId}`;
  try {
    const redis = getRedis();
    const acquired = await redis.set(key, '1', {
      nx: true,
      ex: BULK_INVITE_LOCK_TTL_SEC,
    });
    // Upstash REST SET NX returns "OK" on success, null when not acquired.
    if (acquired !== 'OK') {
      console.warn(
        JSON.stringify({
          event: 'bulk_invite_lock_busy',
          org_id: orgId,
        }),
      );
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: 'Another invitation send is already in progress for this organization.',
            code: 'bulk_invite_in_progress',
          },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      };
    }
    let released = false;
    return {
      ok: true,
      lock: {
        release: async () => {
          if (released) return;
          released = true;
          try {
            await redis.del(key);
          } catch (err) {
            console.error('[bulk-invite] lock release failed (non-fatal):', err);
          }
        },
      },
    };
  } catch (err) {
    console.error('[bulk-invite] lock acquire Redis error, failing closed:', err);
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Service temporarily unavailable. Please retry in a moment.',
          code: 'rate_limit_backend_unavailable',
        },
        { status: 503, headers: { 'Retry-After': '30' } },
      ),
    };
  }
}
