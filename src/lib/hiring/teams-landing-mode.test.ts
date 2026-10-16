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

describe('teams-landing-mode', () => {
  beforeEach(() => {
    redisStore.clear()
    redisConfigured = true
    redisThrowError = false
    delete process.env.TEAMS_LANDING_MODE
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.TEAMS_LANDING_MODE
  })

  it('defaults to coming_soon when Redis key is absent', async () => {
    const { getTeamsLandingMode } = await import('./teams-landing-mode')
    await expect(getTeamsLandingMode()).resolves.toBe('coming_soon')
  })

  it('fails closed to coming_soon when Redis is not configured', async () => {
    redisConfigured = false
    const { getTeamsLandingMode } = await import('./teams-landing-mode')
    await expect(getTeamsLandingMode()).resolves.toBe('coming_soon')
  })

  it('fails closed to coming_soon when Redis throws', async () => {
    redisThrowError = true
    const { getTeamsLandingMode } = await import('./teams-landing-mode')
    await expect(getTeamsLandingMode()).resolves.toBe('coming_soon')
  })

  it('returns live when set in Redis', async () => {
    redisStore.set('product:teams:landing_mode', 'live')
    const { getTeamsLandingMode } = await import('./teams-landing-mode')
    await expect(getTeamsLandingMode()).resolves.toBe('live')
  })

  it('env override wins over Redis', async () => {
    redisStore.set('product:teams:landing_mode', 'live')
    process.env.TEAMS_LANDING_MODE = 'coming_soon'
    const { getTeamsLandingMode, isTeamsLandingEnvPinned } = await import(
      './teams-landing-mode'
    )
    await expect(getTeamsLandingMode()).resolves.toBe('coming_soon')
    expect(isTeamsLandingEnvPinned()).toBe(true)
  })

  it('setTeamsLandingMode persists to Redis', async () => {
    const { setTeamsLandingMode, getTeamsLandingMode } = await import(
      './teams-landing-mode'
    )
    await setTeamsLandingMode('live')
    await expect(getTeamsLandingMode()).resolves.toBe('live')
  })

  it('setTeamsLandingMode throws when Redis is unavailable', async () => {
    redisConfigured = false
    const { setTeamsLandingMode } = await import('./teams-landing-mode')
    await expect(setTeamsLandingMode('live')).rejects.toThrow(/Redis is not configured/)
  })
})
