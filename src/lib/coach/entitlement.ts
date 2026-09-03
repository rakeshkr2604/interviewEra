import getRedis from '@/lib/redis/client'
import { isPaidPlanActive } from '@/lib/pricing/plan-status'
import { createServiceClient } from '@/lib/supabase/server'
import {
  COACH_DURATIONS_MINUTES,
  COACH_ENTITLEMENT_CACHE_TTL_SECONDS,
  COACH_FREE_COOLDOWN_SECONDS,
  COACH_FREE_DURATION_MINUTES,
  COACH_FREE_SESSIONS_PER_WINDOW,
  COACH_HOUR_SECONDS,
  COACH_PAID_MAX_DURATION_MINUTES,
  COACH_PAID_SESSIONS_PER_DAY,
  formatCoachCooldownHint,
  type CoachDurationMinutes,
} from './constants'
import {
  getPaidCoachUsage,
  peekFreeCoachCooldown,
  type CoachQuotaPeek,
} from './quota'

export type CoachEntitlement = {
  isPaid: boolean
  planTier: string
  allowedDurations: CoachDurationMinutes[]
  defaultDurationMinutes: CoachDurationMinutes
  freeSessionsPerWindow: number
  freeCooldownHours: number
  paidSessionsPerDay: number
  quota: CoachQuotaPeek
  canStart: boolean
  upgradeUrl: string
}

type CachedEntitlement = Omit<CoachEntitlement, 'quota' | 'canStart'> & {
  planStatus: string | null
  planExpiresAt: string | null
}

function entitlementCacheKey(userId: string): string {
  return `coach:entitlement:${userId}`
}

/** Paid coach access: active starter/pro, or campus seat. */
export function hasCoachPaidAccess(
  planTier: string,
  planStatus: string | null | undefined,
  planExpiresAt: string | null | undefined
): boolean {
  if (planTier === 'campus' || planTier === 'campus_admin') return true
  return isPaidPlanActive(planTier, planStatus, planExpiresAt)
}

export function allowedDurationsForPaid(isPaid: boolean): CoachDurationMinutes[] {
  if (isPaid) return [...COACH_DURATIONS_MINUTES]
  return [COACH_FREE_DURATION_MINUTES]
}

async function loadPlanRow(userId: string): Promise<{
  plan_tier: string
  plan_status: string | null
  plan_expires_at: string | null
}> {
  const cacheKey = entitlementCacheKey(userId)
  try {
    const cached = await getRedis().get<CachedEntitlement>(cacheKey)
    if (cached?.planTier) {
      return {
        plan_tier: cached.planTier,
        plan_status: cached.planStatus,
        plan_expires_at: cached.planExpiresAt,
      }
    }
  } catch (err) {
    console.error('[coach:entitlement] cache read failed, hitting DB', err)
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('users')
    .select('plan_tier, plan_status, plan_expires_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[coach:entitlement] users lookup failed', error.message)
  }

  const planTier = data?.plan_tier ?? 'free'
  const planStatus = data?.plan_status ?? null
  const planExpiresAt = data?.plan_expires_at ?? null
  const isPaid = hasCoachPaidAccess(planTier, planStatus, planExpiresAt)
  const allowedDurations = allowedDurationsForPaid(isPaid)

  const snapshot: CachedEntitlement = {
    isPaid,
    planTier,
    planStatus,
    planExpiresAt,
    allowedDurations,
    defaultDurationMinutes: isPaid
      ? COACH_PAID_MAX_DURATION_MINUTES
      : COACH_FREE_DURATION_MINUTES,
    freeSessionsPerWindow: COACH_FREE_SESSIONS_PER_WINDOW,
    freeCooldownHours: COACH_FREE_COOLDOWN_SECONDS / COACH_HOUR_SECONDS,
    paidSessionsPerDay: COACH_PAID_SESSIONS_PER_DAY,
    upgradeUrl: '/upgrade',
  }

  try {
    await getRedis().set(cacheKey, snapshot, { ex: COACH_ENTITLEMENT_CACHE_TTL_SECONDS })
  } catch (err) {
    console.error('[coach:entitlement] cache write failed', err)
  }

  return {
    plan_tier: planTier,
    plan_status: planStatus,
    plan_expires_at: planExpiresAt,
  }
}

export async function resolveCoachEntitlement(userId: string): Promise<CoachEntitlement> {
  const row = await loadPlanRow(userId)
  const isPaid = hasCoachPaidAccess(row.plan_tier, row.plan_status, row.plan_expires_at)
  const allowedDurations = allowedDurationsForPaid(isPaid)

  const quota = isPaid
    ? await getPaidCoachUsage(userId)
    : await peekFreeCoachCooldown(userId)

  const canStart = quota.remaining > 0

  return {
    isPaid,
    planTier: row.plan_tier,
    allowedDurations,
    defaultDurationMinutes: isPaid
      ? COACH_PAID_MAX_DURATION_MINUTES
      : COACH_FREE_DURATION_MINUTES,
    freeSessionsPerWindow: COACH_FREE_SESSIONS_PER_WINDOW,
    freeCooldownHours: COACH_FREE_COOLDOWN_SECONDS / COACH_HOUR_SECONDS,
    paidSessionsPerDay: COACH_PAID_SESSIONS_PER_DAY,
    quota,
    canStart,
    upgradeUrl: '/upgrade',
  }
}

/** Plan duration allowlist only (not quota). */
export function assertDurationAllowed(
  entitlement: CoachEntitlement,
  durationMinutes: CoachDurationMinutes
): { ok: true } | { ok: false; status: number; error: string; upgradeUrl?: string } {
  if (!entitlement.allowedDurations.includes(durationMinutes)) {
    return {
      ok: false,
      status: 403,
      error:
        durationMinutes === 5
          ? '5-minute Coach sessions are available on paid plans.'
          : 'This session length is not available on your plan.',
      upgradeUrl: entitlement.upgradeUrl,
    }
  }
  return { ok: true }
}

/** Quota / cooldown gate for a fresh mint (skip when reusing a pending lease). */
export function assertCoachCanStart(
  entitlement: CoachEntitlement
): { ok: true } | { ok: false; status: number; error: string; upgradeUrl?: string } {
  if (entitlement.canStart) return { ok: true }
  const resetHint = formatCoachCooldownHint(entitlement.quota.resetInSeconds)
  return {
    ok: false,
    status: 429,
    error: entitlement.isPaid
      ? `Daily Coach limit reached. Try again in about ${resetHint}.`
      : `Free tier includes 1 Coach session every 2 hours. Try again in about ${resetHint}, or upgrade for more.`,
    upgradeUrl: entitlement.upgradeUrl,
  }
}
