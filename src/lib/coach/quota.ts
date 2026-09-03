import getRedis from '@/lib/redis/client'
import { checkRateLimit } from '@/lib/redis/rate-limit'
import {
  COACH_DAY_SECONDS,
  COACH_FREE_COOLDOWN_SECONDS,
  COACH_FREE_SESSIONS_PER_WINDOW,
  COACH_HOUR_SECONDS,
  COACH_IP_MINTS_PER_HOUR,
  COACH_PAID_SESSIONS_PER_DAY,
  COACH_PENDING_TTL_SECONDS,
  formatCoachCooldownHint,
  type CoachDurationMinutes,
} from './constants'

async function invalidateCoachEntitlementCache(userId: string): Promise<void> {
  try {
    await getRedis().del(`coach:entitlement:${userId}`)
  } catch (err) {
    console.error('[coach:quota] entitlement cache invalidate failed', err)
  }
}

export type CoachQuotaPeek = {
  remaining: number
  limit: number
  resetInSeconds: number
  used: number
}

export type CoachPendingSession = {
  roomId: string
  durationMinutes: CoachDurationMinutes
  quotaConsumed: boolean
  /** True once a new quota unit was consumed for this pending window (and not refunded). */
  isPaid: boolean
  createdAt: string
  /** Set after successful server-side agent dispatch. */
  connectedAt?: string
  /** QStash message id for the active hard-cutoff / abandon job. */
  endMessageId?: string | null
  /** Idempotency: quota already returned after a failed mint/connect. */
  refunded?: boolean
}

function freeKey(userId: string): string {
  return `coach:free:${userId}`
}

function pendingKey(userId: string): string {
  return `coach:pending:${userId}`
}

function paidUsageKey(userId: string): string {
  const windowSlot = Math.floor(Date.now() / (COACH_DAY_SECONDS * 1000))
  return `rl:coach:paid:${userId}:${windowSlot}`
}

export async function peekFreeCoachCooldown(userId: string): Promise<CoachQuotaPeek> {
  try {
    const redis = getRedis()
    const ttl = await redis.ttl(freeKey(userId))
    if (ttl > 0) {
      return {
        remaining: 0,
        limit: COACH_FREE_SESSIONS_PER_WINDOW,
        resetInSeconds: ttl,
        used: COACH_FREE_SESSIONS_PER_WINDOW,
      }
    }
    return {
      remaining: COACH_FREE_SESSIONS_PER_WINDOW,
      limit: COACH_FREE_SESSIONS_PER_WINDOW,
      resetInSeconds: 0,
      used: 0,
    }
  } catch (err) {
    console.error('[coach:quota] free peek failed, allowing', err)
    return {
      remaining: COACH_FREE_SESSIONS_PER_WINDOW,
      limit: COACH_FREE_SESSIONS_PER_WINDOW,
      resetInSeconds: 0,
      used: 0,
    }
  }
}

export async function getPaidCoachUsage(userId: string): Promise<CoachQuotaPeek> {
  try {
    const redis = getRedis()
    const redisKey = paidUsageKey(userId)
    const count = (await redis.get<number>(redisKey)) ?? 0
    const used = typeof count === 'number' ? count : Number(count) || 0
    const remaining = Math.max(0, COACH_PAID_SESSIONS_PER_DAY - used)
    const resetInSeconds =
      COACH_DAY_SECONDS - (Math.floor(Date.now() / 1000) % COACH_DAY_SECONDS)
    return {
      remaining,
      limit: COACH_PAID_SESSIONS_PER_DAY,
      resetInSeconds,
      used,
    }
  } catch (err) {
    console.error('[coach:quota] paid peek failed, allowing', err)
    return {
      remaining: COACH_PAID_SESSIONS_PER_DAY,
      limit: COACH_PAID_SESSIONS_PER_DAY,
      resetInSeconds: COACH_DAY_SECONDS,
      used: 0,
    }
  }
}

export async function getPendingCoachSession(
  userId: string
): Promise<CoachPendingSession | null> {
  try {
    const pending = await getRedis().get<CoachPendingSession>(pendingKey(userId))
    return pending ?? null
  } catch (err) {
    console.error('[coach:quota] pending read failed', err)
    return null
  }
}

export async function setPendingCoachSession(
  userId: string,
  pending: CoachPendingSession
): Promise<void> {
  try {
    await getRedis().set(pendingKey(userId), pending, { ex: COACH_PENDING_TTL_SECONDS })
  } catch (err) {
    console.error('[coach:quota] pending write failed', err)
  }
}

export async function clearPendingCoachSession(userId: string): Promise<void> {
  try {
    await getRedis().del(pendingKey(userId))
  } catch (err) {
    console.error('[coach:quota] pending clear failed', err)
  }
}

/**
 * Consume daily quota unless an unexpired pending mint already paid for this window.
 * Returns whether a new quota unit was consumed.
 */
export async function consumeCoachQuotaIfNeeded(params: {
  userId: string
  isPaid: boolean
  reusePending: boolean
}): Promise<
  | { ok: true; consumedNew: boolean }
  | { ok: false; status: number; error: string; resetInSeconds: number }
> {
  const { userId, isPaid, reusePending } = params

  if (reusePending) {
    return { ok: true, consumedNew: false }
  }

  if (!isPaid) {
    try {
      const redis = getRedis()
      const result = await redis.set(freeKey(userId), String(Date.now()), {
        nx: true,
        ex: COACH_FREE_COOLDOWN_SECONDS,
      })
      if (result !== 'OK') {
        const ttl = await redis.ttl(freeKey(userId))
        const resetInSeconds = ttl > 0 ? ttl : COACH_FREE_COOLDOWN_SECONDS
        return {
          ok: false,
          status: 429,
          error: `Free tier includes 1 Coach session every 2 hours. Try again in about ${formatCoachCooldownHint(resetInSeconds)}, or upgrade for 5-minute sessions.`,
          resetInSeconds,
        }
      }
      await invalidateCoachEntitlementCache(userId)
      return { ok: true, consumedNew: true }
    } catch (err) {
      console.error('[coach:quota] free consume failed closed', err)
      return {
        ok: false,
        status: 503,
        error: 'Service temporarily unavailable. Please retry in a moment.',
        resetInSeconds: 60,
      }
    }
  }

  const rateLimit = await checkRateLimit(
    `coach:paid:${userId}`,
    COACH_DAY_SECONDS,
    COACH_PAID_SESSIONS_PER_DAY,
    { failClosed: true }
  )
  if (!rateLimit.allowed) {
    return {
      ok: false,
      status: rateLimit.redisUnavailable ? 503 : 429,
      error: rateLimit.redisUnavailable
        ? 'Service temporarily unavailable. Please retry in a moment.'
        : 'Daily Coach limit reached. Try again later.',
      resetInSeconds: rateLimit.resetInSeconds,
    }
  }

  await invalidateCoachEntitlementCache(userId)
  return { ok: true, consumedNew: true }
}

/**
 * Reverse a consume from {@link consumeCoachQuotaIfNeeded}.
 * Free: delete cooldown key. Paid: DECR the current window counter (floor at 0).
 */
export async function refundCoachQuota(params: {
  userId: string
  isPaid: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, isPaid } = params
  try {
    const redis = getRedis()
    if (!isPaid) {
      await redis.del(freeKey(userId))
    } else {
      const key = paidUsageKey(userId)
      const next = await redis.decr(key)
      if (typeof next === 'number' && next < 0) {
        await redis.set(key, 0, { ex: COACH_DAY_SECONDS * 2 })
      }
    }
    await invalidateCoachEntitlementCache(userId)
    return { ok: true }
  } catch (err) {
    console.error('[coach:quota] refund failed', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'quota refund failed',
    }
  }
}

/**
 * Refund once for a pending lease that burned quota but never became a usable session.
 * Marks pending.refunded to stay idempotent across retries.
 */
export async function refundPendingCoachQuotaIfNeeded(
  userId: string,
  pending: CoachPendingSession | null
): Promise<{ refunded: boolean }> {
  if (!pending?.quotaConsumed || pending.refunded) {
    return { refunded: false }
  }

  const result = await refundCoachQuota({
    userId,
    isPaid: pending.isPaid,
  })
  if (!result.ok) {
    return { refunded: false }
  }

  await setPendingCoachSession(userId, {
    ...pending,
    quotaConsumed: false,
    refunded: true,
  })
  return { refunded: true }
}

export async function checkCoachIpMintLimit(ip: string): Promise<
  | { ok: true }
  | { ok: false; status: number; error: string; resetInSeconds: number }
> {
  const rateLimit = await checkRateLimit(
    `coach:ip:${ip || 'unknown'}`,
    COACH_HOUR_SECONDS,
    COACH_IP_MINTS_PER_HOUR,
    { failClosed: true }
  )
  if (rateLimit.allowed) return { ok: true }
  return {
    ok: false,
    status: rateLimit.redisUnavailable ? 503 : 429,
    error: rateLimit.redisUnavailable
      ? 'Service temporarily unavailable. Please retry in a moment.'
      : 'Too many Coach session requests from this network. Please wait and try again.',
    resetInSeconds: rateLimit.resetInSeconds,
  }
}
