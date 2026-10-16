import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redisStore = new Map<string, string>()
let redisConfigured = true
let redisThrowError = false

vi.mock('@/lib/redis/client', () => ({
  isRedisConfigured: () => redisConfigured,
  getRedis: () => {
    if (!redisConfigured) {
      throw new Error('Redis not configured')
    }
    return {
      get: async (key: string) => {
        if (redisThrowError) throw new Error('Redis get failed')
        return redisStore.get(key) ?? null
      },
      set: async (key: string, value: string) => {
        if (redisThrowError) throw new Error('Redis set failed')
        redisStore.set(key, value)
        return 'OK'
      },
    }
  },
}))

describe('campus-landing-mode', () => {
  beforeEach(() => {
    redisStore.clear()
    redisConfigured = true
    redisThrowError = false
    delete process.env.CAMPUS_LANDING_MODE
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.CAMPUS_LANDING_MODE
  })

  it('defaults to coming_soon when Redis key is absent', async () => {
    const { getCampusLandingMode } = await import('./campus-landing-mode')
    await expect(getCampusLandingMode()).resolves.toBe('coming_soon')
  })

  it('fails closed to coming_soon when Redis is not configured', async () => {
    redisConfigured = false
    const { getCampusLandingMode } = await import('./campus-landing-mode')
    await expect(getCampusLandingMode()).resolves.toBe('coming_soon')
  })

  it('fails closed to coming_soon when Redis throws', async () => {
    redisThrowError = true
    const { getCampusLandingMode } = await import('./campus-landing-mode')
    await expect(getCampusLandingMode()).resolves.toBe('coming_soon')
  })

  it('returns live when set in Redis', async () => {
    redisStore.set('product:campus:landing_mode', 'live')
    const { getCampusLandingMode } = await import('./campus-landing-mode')
    await expect(getCampusLandingMode()).resolves.toBe('live')
  })

  it('env override wins over Redis', async () => {
    redisStore.set('product:campus:landing_mode', 'live')
    process.env.CAMPUS_LANDING_MODE = 'coming_soon'
    const { getCampusLandingMode, isCampusLandingEnvPinned } = await import(
      './campus-landing-mode'
    )
    await expect(getCampusLandingMode()).resolves.toBe('coming_soon')
    expect(isCampusLandingEnvPinned()).toBe(true)
  })

  it('setCampusLandingMode persists to Redis', async () => {
    const { setCampusLandingMode, getCampusLandingMode } = await import(
      './campus-landing-mode'
    )
    await setCampusLandingMode('live')
    await expect(getCampusLandingMode()).resolves.toBe('live')
  })
})
