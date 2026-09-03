/**
 * AI Interview Coach — product policy (founder decisions).
 *
 * - Free: 3-minute sessions only, 1 session per 2h cooldown.
 * - Paid (active starter/pro) + campus seats: 3 or 5 minutes, 10 / 24h.
 * - IP burst limits on mint to slow multi-account abuse.
 * - No credit deduction — coach is a retention / upgrade funnel surface.
 */

export const COACH_DURATIONS_MINUTES = [3, 5] as const
export type CoachDurationMinutes = (typeof COACH_DURATIONS_MINUTES)[number]

export const COACH_ACCESS_MODES = [
  'disabled',
  'admin_only',
  'allowlist',
  'public',
] as const

export type CoachAccessMode = (typeof COACH_ACCESS_MODES)[number]

export function isValidCoachAccessMode(val: unknown): val is CoachAccessMode {
  return typeof val === 'string' && (COACH_ACCESS_MODES as readonly string[]).includes(val)
}

export function normalizeCoachEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null
  const normalized = email.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

export const COACH_FREE_DURATION_MINUTES: CoachDurationMinutes = 3
export const COACH_PAID_MAX_DURATION_MINUTES: CoachDurationMinutes = 5

export const COACH_FREE_SESSIONS_PER_WINDOW = 1
export const COACH_PAID_SESSIONS_PER_DAY = 10

/** Room mint / reset burst per IP. */
export const COACH_IP_MINTS_PER_HOUR = 8

export const COACH_HOUR_SECONDS = 60 * 60
/** Free-tier cooldown between Coach session mints. */
export const COACH_FREE_COOLDOWN_SECONDS = 2 * COACH_HOUR_SECONDS
export const COACH_DAY_SECONDS = 24 * COACH_HOUR_SECONDS

/** Cached plan/entitlement snapshot. */
export const COACH_ENTITLEMENT_CACHE_TTL_SECONDS = 60

/** Pending minted room before/during join — allows Reset without re-burning quota. */
export const COACH_PENDING_TTL_SECONDS = 30 * 60

export function isCoachDurationMinutes(value: unknown): value is CoachDurationMinutes {
  return value === 3 || value === 5
}

export function coachDurationSeconds(minutes: CoachDurationMinutes): number {
  return minutes * 60
}

export function formatCoachCooldownHint(resetInSeconds: number): string {
  if (resetInSeconds <= 0) return 'soon'
  const hours = Math.floor(resetInSeconds / 3600)
  const mins = Math.ceil((resetInSeconds % 3600) / 60)
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  return `${Math.max(1, mins)}m`
}
