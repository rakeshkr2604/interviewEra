import { getRedis, isRedisConfigured } from '@/lib/redis/client'
import { isPlatformAdminUser } from '@/lib/admin/auth'

import {
  COACH_ACCESS_MODES,
  type CoachAccessMode,
  isValidCoachAccessMode,
  normalizeCoachEmail,
} from './constants'

export {
  COACH_ACCESS_MODES,
  type CoachAccessMode,
  isValidCoachAccessMode,
  normalizeCoachEmail,
}

export const REDIS_KEY_COACH_MODE = 'coach:config:mode'
export const REDIS_KEY_COACH_ALLOWLIST = 'coach:allowlist:emails'

export type CoachAccessResult =
  | { allowed: true; mode: CoachAccessMode }
  | { allowed: false; status: 401 | 403; error: string; mode: CoachAccessMode }

/**
 * Read the current Coach access mode from Redis.
 * Default and fail-closed is strictly 'disabled'.
 */
export async function getCoachAccessMode(): Promise<CoachAccessMode> {
  if (!isRedisConfigured()) {
    return 'disabled'
  }
  try {
    const redis = getRedis()
    const raw = await redis.get<string>(REDIS_KEY_COACH_MODE)
    if (isValidCoachAccessMode(raw)) {
      return raw
    }
    return 'disabled'
  } catch (err) {
    console.error('[coach:access] failed to read mode from Redis, failing closed', err)
    return 'disabled'
  }
}

/**
 * Check whether a normalized email exists in the Coach allowlist Redis Set.
 */
export async function isEmailAllowlisted(email: string | null | undefined): Promise<boolean> {
  const normalized = normalizeCoachEmail(email)
  if (!normalized || !isRedisConfigured()) {
    return false
  }
  try {
    const redis = getRedis()
    const isMember = await redis.sismember(REDIS_KEY_COACH_ALLOWLIST, normalized)
    return isMember === 1
  } catch (err) {
    console.error('[coach:access] allowlist lookup failed, failing closed', err)
    return false
  }
}

/**
 * Centralized authorization check for AI Interview Coach.
 *
 * Rules:
 * - unauthenticated -> 401 Unauthorized
 * - disabled -> 403 Forbidden (fail-closed default)
 * - admin_only -> allowed for platform admins; 403 for everyone else
 * - allowlist -> allowed for platform admins AND allowlisted emails; 403 for others
 * - public -> allowed (existing entitlement/quota gates apply downstream)
 */
export async function assertCoachAccess(
  user: { id: string; email?: string | null } | null | undefined
): Promise<CoachAccessResult> {
  const mode = await getCoachAccessMode()

  if (!user || !user.id) {
    return {
      allowed: false,
      status: 401,
      error: 'Authentication required to access AI Interview Coach.',
      mode,
    }
  }

  if (mode === 'disabled') {
    return {
      allowed: false,
      status: 403,
      error: 'AI Interview Coach is currently unavailable.',
      mode,
    }
  }

  if (mode === 'public') {
    return { allowed: true, mode }
  }

  const isAdmin = await isPlatformAdminUser(user.id, user.email)
  if (isAdmin) {
    return { allowed: true, mode }
  }

  if (mode === 'admin_only') {
    return {
      allowed: false,
      status: 403,
      error: 'AI Interview Coach is restricted to platform administrators.',
      mode,
    }
  }

  if (mode === 'allowlist') {
    const allowlisted = await isEmailAllowlisted(user.email)
    if (allowlisted) {
      return { allowed: true, mode }
    }
    return {
      allowed: false,
      status: 403,
      error: 'AI Interview Coach is currently in private preview for selected testers.',
      mode,
    }
  }

  // Any unrecognized state fails closed
  return {
    allowed: false,
    status: 403,
    error: 'AI Interview Coach is currently unavailable.',
    mode: 'disabled',
  }
}

/**
 * Set the Coach access mode in Redis. Admin only.
 */
export async function setCoachAccessMode(mode: CoachAccessMode): Promise<void> {
  if (!isValidCoachAccessMode(mode)) {
    throw new Error(`Invalid Coach access mode: ${mode}`)
  }
  const redis = getRedis()
  await redis.set(REDIS_KEY_COACH_MODE, mode)
}

/**
 * Add emails to the Coach allowlist Redis Set. Normalizes all emails.
 */
export async function addEmailsToCoachAllowlist(emails: string[]): Promise<number> {
  const valid = emails
    .map(normalizeCoachEmail)
    .filter((e): e is string => Boolean(e))

  if (valid.length === 0) return 0

  const redis = getRedis()
  const added = await redis.sadd(REDIS_KEY_COACH_ALLOWLIST, valid[0], ...valid.slice(1))
  return typeof added === 'number' ? added : valid.length
}

/**
 * Remove emails from the Coach allowlist Redis Set.
 */
export async function removeEmailsFromCoachAllowlist(emails: string[]): Promise<number> {
  const valid = emails
    .map(normalizeCoachEmail)
    .filter((e): e is string => Boolean(e))

  if (valid.length === 0) return 0

  const redis = getRedis()
  const removed = await redis.srem(REDIS_KEY_COACH_ALLOWLIST, valid[0], ...valid.slice(1))
  return typeof removed === 'number' ? removed : valid.length
}

/**
 * Retrieve all currently allowlisted emails.
 */
export async function getCoachAllowlist(): Promise<string[]> {
  if (!isRedisConfigured()) return []
  try {
    const redis = getRedis()
    const members = await redis.smembers(REDIS_KEY_COACH_ALLOWLIST)
    return Array.isArray(members) ? members.sort() : []
  } catch (err) {
    console.error('[coach:access] failed to fetch allowlist', err)
    return []
  }
}

/**
 * Clear all members of the Coach allowlist Redis Set.
 */
export async function clearCoachAllowlist(): Promise<void> {
  if (!isRedisConfigured()) return
  const redis = getRedis()
  await redis.del(REDIS_KEY_COACH_ALLOWLIST)
}
