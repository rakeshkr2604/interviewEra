import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redisStore = new Map<string, { value: string | number; ex?: number }>()

vi.mock('@/lib/redis/client', () => ({
  default: () => ({
    async get<T>(key: string): Promise<T | null> {
      const row = redisStore.get(key)
      return row ? (row.value as T) : null
    },
    async set(key: string, value: string | number, opts?: { ex?: number; nx?: boolean }) {
      if (opts?.nx && redisStore.has(key)) return null
      redisStore.set(key, { value, ex: opts?.ex })
      return 'OK'
    },
    async del(key: string) {
      redisStore.delete(key)
      return 1
    },
    async ttl(key: string) {
      return redisStore.has(key) ? 3600 : -2
    },
    async decr(key: string) {
      const row = redisStore.get(key)
      const current = typeof row?.value === 'number' ? row.value : Number(row?.value ?? 0)
      const next = current - 1
      redisStore.set(key, { value: next, ex: row?.ex })
      return next
    },
  }),
  getRedis: () => ({
    async get<T>(key: string): Promise<T | null> {
      const row = redisStore.get(key)
      return row ? (row.value as T) : null
    },
    async set(key: string, value: string | number, opts?: { ex?: number; nx?: boolean }) {
      if (opts?.nx && redisStore.has(key)) return null
      redisStore.set(key, { value, ex: opts?.ex })
      return 'OK'
    },
    async del(key: string) {
      redisStore.delete(key)
      return 1
    },
    async ttl(key: string) {
      return redisStore.has(key) ? 3600 : -2
    },
    async decr(key: string) {
      const row = redisStore.get(key)
      const current = typeof row?.value === 'number' ? row.value : Number(row?.value ?? 0)
      const next = current - 1
      redisStore.set(key, { value: next, ex: row?.ex })
      return next
    },
  }),
}))

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 9,
    resetInSeconds: 86_400,
  })),
}))

import {
  consumeCoachQuotaIfNeeded,
  getPendingCoachSession,
  peekFreeCoachCooldown,
  refundCoachQuota,
  refundPendingCoachQuotaIfNeeded,
  setPendingCoachSession,
} from './quota'

describe('coach quota refund', () => {
  beforeEach(() => {
    redisStore.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('refunds free-tier cooldown after a consumed mint that never became usable', async () => {
    const userId = 'user-free-1'
    const consumed = await consumeCoachQuotaIfNeeded({
      userId,
      isPaid: false,
      reusePending: false,
    })
    expect(consumed).toEqual({ ok: true, consumedNew: true })

    const blocked = await peekFreeCoachCooldown(userId)
    expect(blocked.remaining).toBe(0)

    const refund = await refundCoachQuota({ userId, isPaid: false })
    expect(refund).toEqual({ ok: true })

    const after = await peekFreeCoachCooldown(userId)
    expect(after.remaining).toBe(1)
    expect(after.used).toBe(0)
  })

  it('decrements paid usage on refund (room-create failure path)', async () => {
    const userId = 'user-paid-1'
    const windowSlot = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
    const key = `rl:coach:paid:${userId}:${windowSlot}`
    redisStore.set(key, { value: 3 })

    const refund = await refundCoachQuota({ userId, isPaid: true })
    expect(refund).toEqual({ ok: true })
    expect(redisStore.get(key)?.value).toBe(2)
  })

  it('refundPendingCoachQuotaIfNeeded is idempotent', async () => {
    const userId = 'user-pending-1'
    await consumeCoachQuotaIfNeeded({
      userId,
      isPaid: false,
      reusePending: false,
    })
    await setPendingCoachSession(userId, {
      roomId: 'room-abc',
      durationMinutes: 3,
      quotaConsumed: true,
      isPaid: false,
      createdAt: new Date().toISOString(),
      refunded: false,
    })

    const first = await refundPendingCoachQuotaIfNeeded(
      userId,
      await getPendingCoachSession(userId)
    )
    expect(first.refunded).toBe(true)

    const pending = await getPendingCoachSession(userId)
    expect(pending?.refunded).toBe(true)
    expect(pending?.quotaConsumed).toBe(false)

    const second = await refundPendingCoachQuotaIfNeeded(userId, pending)
    expect(second.refunded).toBe(false)

    const after = await peekFreeCoachCooldown(userId)
    expect(after.remaining).toBe(1)
  })
})
