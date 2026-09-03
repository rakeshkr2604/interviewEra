import { describe, expect, it } from 'vitest'
import {
  allowedDurationsForPaid,
  assertCoachCanStart,
  assertDurationAllowed,
  hasCoachPaidAccess,
  type CoachEntitlement,
} from '@/lib/coach/entitlement'
import {
  COACH_FREE_COOLDOWN_SECONDS,
  COACH_FREE_DURATION_MINUTES,
  isCoachDurationMinutes,
} from '@/lib/coach/constants'

function baseEntitlement(overrides: Partial<CoachEntitlement> = {}): CoachEntitlement {
  return {
    isPaid: false,
    planTier: 'free',
    allowedDurations: [3],
    defaultDurationMinutes: 3,
    freeSessionsPerWindow: 1,
    freeCooldownHours: 2,
    paidSessionsPerDay: 10,
    quota: { remaining: 1, limit: 1, resetInSeconds: 0, used: 0 },
    canStart: true,
    upgradeUrl: '/upgrade',
    ...overrides,
  }
}

describe('coach entitlement', () => {
  it('treats active starter/pro as paid', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    expect(hasCoachPaidAccess('starter', 'active', future)).toBe(true)
    expect(hasCoachPaidAccess('pro', 'active', future)).toBe(true)
    expect(hasCoachPaidAccess('free', 'active', future)).toBe(false)
    expect(hasCoachPaidAccess('starter', 'expired', future)).toBe(false)
  })

  it('treats campus seats as paid Coach access', () => {
    expect(hasCoachPaidAccess('campus', null, null)).toBe(true)
    expect(hasCoachPaidAccess('campus_admin', null, null)).toBe(true)
  })

  it('locks free users to 3 minutes', () => {
    expect(allowedDurationsForPaid(false)).toEqual([COACH_FREE_DURATION_MINUTES])
    expect(allowedDurationsForPaid(true)).toEqual([3, 5])
  })

  it('accepts only 3 or 5 minute durations', () => {
    expect(isCoachDurationMinutes(3)).toBe(true)
    expect(isCoachDurationMinutes(5)).toBe(true)
    expect(isCoachDurationMinutes(10)).toBe(false)
  })

  it('uses a 2-hour free-tier cooldown window', () => {
    expect(COACH_FREE_COOLDOWN_SECONDS).toBe(2 * 60 * 60)
  })

  it('assertDurationAllowed only checks plan duration', () => {
    const blockedQuota = baseEntitlement({ canStart: false, quota: { remaining: 0, limit: 1, resetInSeconds: 100, used: 1 } })
    expect(assertDurationAllowed(blockedQuota, 3)).toEqual({ ok: true })
    expect(assertDurationAllowed(blockedQuota, 5).ok).toBe(false)
  })

  it('assertCoachCanStart gates quota separately', () => {
    expect(assertCoachCanStart(baseEntitlement({ canStart: true })).ok).toBe(true)
    const blocked = assertCoachCanStart(
      baseEntitlement({
        canStart: false,
        quota: { remaining: 0, limit: 1, resetInSeconds: 7200, used: 1 },
      })
    )
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.status).toBe(429)
  })
})
