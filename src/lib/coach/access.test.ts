import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COACH_ACCESS_MODES,
  REDIS_KEY_COACH_MODE,
  addEmailsToCoachAllowlist,
  assertCoachAccess,
  clearCoachAllowlist,
  getCoachAccessMode,
  getCoachAllowlist,
  isEmailAllowlisted,
  isValidCoachAccessMode,
  normalizeCoachEmail,
  removeEmailsFromCoachAllowlist,
  setCoachAccessMode,
} from './access'

const redisKV = new Map<string, string>()
const redisSets = new Map<string, Set<string>>()
let redisConfigured = true
let redisThrowError = false

vi.mock('@/lib/redis/client', () => ({
  isRedisConfigured: () => redisConfigured,
  getRedis: () => {
    if (redisThrowError) {
      throw new Error('Redis connection failed')
    }
    return {
      async get<T>(key: string): Promise<T | null> {
        if (redisThrowError) throw new Error('Redis get failed')
        const val = redisKV.get(key)
        return (val as T) ?? null
      },
      async set(key: string, value: string): Promise<'OK'> {
        if (redisThrowError) throw new Error('Redis set failed')
        redisKV.set(key, value)
        return 'OK'
      },
      async del(key: string): Promise<number> {
        if (redisThrowError) throw new Error('Redis del failed')
        redisKV.delete(key)
        redisSets.delete(key)
        return 1
      },
      async sismember(key: string, member: string): Promise<number> {
        if (redisThrowError) throw new Error('Redis sismember failed')
        const s = redisSets.get(key)
        return s && s.has(member) ? 1 : 0
      },
      async sadd(key: string, ...members: string[]): Promise<number> {
        if (redisThrowError) throw new Error('Redis sadd failed')
        let s = redisSets.get(key)
        if (!s) {
          s = new Set<string>()
          redisSets.set(key, s)
        }
        let added = 0
        for (const m of members) {
          if (!s.has(m)) {
            s.add(m)
            added++
          }
        }
        return added
      },
      async srem(key: string, ...members: string[]): Promise<number> {
        if (redisThrowError) throw new Error('Redis srem failed')
        const s = redisSets.get(key)
        if (!s) return 0
        let removed = 0
        for (const m of members) {
          if (s.delete(m)) removed++
        }
        return removed
      },
      async smembers(key: string): Promise<string[]> {
        if (redisThrowError) throw new Error('Redis smembers failed')
        const s = redisSets.get(key)
        return s ? Array.from(s) : []
      },
    }
  },
}))

vi.mock('@/lib/admin/auth', () => ({
  isPlatformAdminUser: vi.fn(async (userId: string, email?: string | null) => {
    return email === 'admin@interviewera.com' || email === 'rakesh.kr2604@gmail.com'
  }),
}))

describe('src/lib/coach/access', () => {
  beforeEach(() => {
    redisKV.clear()
    redisSets.clear()
    redisConfigured = true
    redisThrowError = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    redisKV.clear()
    redisSets.clear()
  })

  describe('normalizeCoachEmail', () => {
    it('lowercases and trims valid emails', () => {
      expect(normalizeCoachEmail('  Tester@Example.COM ')).toBe('tester@example.com')
      expect(normalizeCoachEmail('USER@DOMAIN.ORG')).toBe('user@domain.org')
    })

    it('returns null for empty, null, or undefined values', () => {
      expect(normalizeCoachEmail('')).toBeNull()
      expect(normalizeCoachEmail('   ')).toBeNull()
      expect(normalizeCoachEmail(null)).toBeNull()
      expect(normalizeCoachEmail(undefined)).toBeNull()
    })
  })

  describe('isValidCoachAccessMode', () => {
    it('validates supported modes', () => {
      for (const mode of COACH_ACCESS_MODES) {
        expect(isValidCoachAccessMode(mode)).toBe(true)
      }
      expect(isValidCoachAccessMode('invalid')).toBe(false)
      expect(isValidCoachAccessMode('')).toBe(false)
      expect(isValidCoachAccessMode(null)).toBe(false)
      expect(isValidCoachAccessMode(123)).toBe(false)
    })
  })

  describe('getCoachAccessMode', () => {
    it('defaults to disabled when Redis key is absent', async () => {
      expect(await getCoachAccessMode()).toBe('disabled')
    })

    it('fails closed to disabled when Redis is not configured', async () => {
      redisConfigured = false
      redisKV.set(REDIS_KEY_COACH_MODE, 'public')
      expect(await getCoachAccessMode()).toBe('disabled')
    })

    it('fails closed to disabled when Redis throws', async () => {
      redisThrowError = true
      expect(await getCoachAccessMode()).toBe('disabled')
    })

    it('fails closed to disabled when Redis value is invalid', async () => {
      redisKV.set(REDIS_KEY_COACH_MODE, 'unknown_mode')
      expect(await getCoachAccessMode()).toBe('disabled')
    })

    it('returns valid modes when set in Redis', async () => {
      for (const mode of COACH_ACCESS_MODES) {
        await setCoachAccessMode(mode)
        expect(await getCoachAccessMode()).toBe(mode)
      }
    })
  })

  describe('allowlist management', () => {
    it('adds, checks, and removes normalized emails', async () => {
      const added = await addEmailsToCoachAllowlist([
        'Alice@Example.COM',
        '  bob@example.com ',
        'invalid-will-be-cleaned',
      ])
      expect(added).toBe(3)

      expect(await isEmailAllowlisted('alice@example.com')).toBe(true)
      expect(await isEmailAllowlisted('  ALICE@example.com ')).toBe(true)
      expect(await isEmailAllowlisted('bob@example.com')).toBe(true)
      expect(await isEmailAllowlisted('charlie@example.com')).toBe(false)

      const list = await getCoachAllowlist()
      expect(list).toContain('alice@example.com')
      expect(list).toContain('bob@example.com')

      const removed = await removeEmailsFromCoachAllowlist(['ALICE@example.com'])
      expect(removed).toBe(1)
      expect(await isEmailAllowlisted('alice@example.com')).toBe(false)

      await clearCoachAllowlist()
      expect(await getCoachAllowlist()).toEqual([])
      expect(await isEmailAllowlisted('bob@example.com')).toBe(false)
    })

    it('fails closed if Redis throws on lookup', async () => {
      await addEmailsToCoachAllowlist(['tester@example.com'])
      redisThrowError = true
      expect(await isEmailAllowlisted('tester@example.com')).toBe(false)
    })
  })

  describe('assertCoachAccess', () => {
    const adminUser = { id: 'admin-1', email: 'rakesh.kr2604@gmail.com' }
    const testerUser = { id: 'tester-1', email: 'tester@example.com' }
    const normalUser = { id: 'normal-1', email: 'regular@example.com' }

    it('returns 401 when user is missing or has no ID', async () => {
      await setCoachAccessMode('public')
      const resultNull = await assertCoachAccess(null)
      expect(resultNull.allowed).toBe(false)
      expect(resultNull.status).toBe(401)

      const resultNoId = await assertCoachAccess({ id: '', email: 'foo@bar.com' })
      expect(resultNoId.allowed).toBe(false)
      expect(resultNoId.status).toBe(401)
    })

    describe('when mode is disabled (default)', () => {
      beforeEach(async () => {
        await setCoachAccessMode('disabled')
        await addEmailsToCoachAllowlist([testerUser.email])
      })

      it('denies platform admin', async () => {
        const res = await assertCoachAccess(adminUser)
        expect(res.allowed).toBe(false)
        expect(res.status).toBe(403)
        expect(res.mode).toBe('disabled')
      })

      it('denies allowlisted user', async () => {
        const res = await assertCoachAccess(testerUser)
        expect(res.allowed).toBe(false)
        expect(res.status).toBe(403)
        expect(res.mode).toBe('disabled')
      })

      it('denies normal user', async () => {
        const res = await assertCoachAccess(normalUser)
        expect(res.allowed).toBe(false)
        expect(res.status).toBe(403)
        expect(res.mode).toBe('disabled')
      })
    })

    describe('when mode is admin_only', () => {
      beforeEach(async () => {
        await setCoachAccessMode('admin_only')
        await addEmailsToCoachAllowlist([testerUser.email])
      })

      it('allows platform admin', async () => {
        const res = await assertCoachAccess(adminUser)
        expect(res.allowed).toBe(true)
        expect(res.mode).toBe('admin_only')
      })

      it('denies allowlisted non-admin user', async () => {
        const res = await assertCoachAccess(testerUser)
        expect(res.allowed).toBe(false)
        expect(res.status).toBe(403)
        expect(res.mode).toBe('admin_only')
      })

      it('denies normal user', async () => {
        const res = await assertCoachAccess(normalUser)
        expect(res.allowed).toBe(false)
        expect(res.status).toBe(403)
        expect(res.mode).toBe('admin_only')
      })
    })

    describe('when mode is allowlist', () => {
      beforeEach(async () => {
        await setCoachAccessMode('allowlist')
        await addEmailsToCoachAllowlist([testerUser.email])
      })

      it('allows platform admin even if not explicitly on allowlist', async () => {
        const res = await assertCoachAccess(adminUser)
        expect(res.allowed).toBe(true)
        expect(res.mode).toBe('allowlist')
      })

      it('allows allowlisted user (case-insensitively)', async () => {
        const res = await assertCoachAccess({
          id: testerUser.id,
          email: '  TESTER@Example.Com  ',
        })
        expect(res.allowed).toBe(true)
        expect(res.mode).toBe('allowlist')
      })

      it('denies non-allowlisted user', async () => {
        const res = await assertCoachAccess(normalUser)
        expect(res.allowed).toBe(false)
        expect(res.status).toBe(403)
        expect(res.mode).toBe('allowlist')
      })
    })

    describe('when mode is public', () => {
      beforeEach(async () => {
        await setCoachAccessMode('public')
      })

      it('allows authenticated normal user', async () => {
        const res = await assertCoachAccess(normalUser)
        expect(res.allowed).toBe(true)
        expect(res.mode).toBe('public')
      })

      it('allows platform admin', async () => {
        const res = await assertCoachAccess(adminUser)
        expect(res.allowed).toBe(true)
        expect(res.mode).toBe('public')
      })
    })

    describe('fail-closed edge cases', () => {
      it('fails closed when Redis throws error during access check', async () => {
        await setCoachAccessMode('public')
        redisThrowError = true

        const res = await assertCoachAccess(normalUser)
        expect(res.allowed).toBe(false)
        expect(res.status).toBe(403)
        expect(res.mode).toBe('disabled')
      })
    })
  })
})
