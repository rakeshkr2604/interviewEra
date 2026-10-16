/**
 * Runtime gate for the public `/campus` (Colleges) marketing landing.
 *
 * Modes:
 * - `coming_soon` — Coming Soon shell (default / fail-closed while campus sales motion unfinished)
 * - `live` — full CampusLandingClient (for demos / college visits)
 *
 * Precedence: env `CAMPUS_LANDING_MODE` (if valid) → Redis → default `coming_soon`.
 * Mirrors Hiring Teams / Coach: zero-deploy flip from Platform Admin UI.
 */

import { getRedis, isRedisConfigured } from '@/lib/redis/client'

export const CAMPUS_LANDING_MODES = ['coming_soon', 'live'] as const
export type CampusLandingMode = (typeof CAMPUS_LANDING_MODES)[number]

export const REDIS_KEY_CAMPUS_LANDING_MODE = 'product:campus:landing_mode'

export const CAMPUS_LANDING_MODE_DEFAULT: CampusLandingMode = 'coming_soon'

export function isValidCampusLandingMode(value: unknown): value is CampusLandingMode {
  return (
    typeof value === 'string' &&
    (CAMPUS_LANDING_MODES as readonly string[]).includes(value)
  )
}

function readEnvOverride(): CampusLandingMode | null {
  const raw = process.env.CAMPUS_LANDING_MODE?.trim().toLowerCase()
  if (isValidCampusLandingMode(raw)) return raw
  return null
}

/**
 * Resolve which `/campus` surface to show.
 * Env override wins (emergency / staging pin). Otherwise Redis; missing Redis → coming_soon.
 */
export async function getCampusLandingMode(): Promise<CampusLandingMode> {
  const envMode = readEnvOverride()
  if (envMode) return envMode

  if (!isRedisConfigured()) {
    return CAMPUS_LANDING_MODE_DEFAULT
  }

  try {
    const redis = getRedis()
    const raw = await redis.get<string>(REDIS_KEY_CAMPUS_LANDING_MODE)
    if (isValidCampusLandingMode(raw)) return raw
    return CAMPUS_LANDING_MODE_DEFAULT
  } catch (err) {
    console.error(
      '[campus:landing] failed to read mode from Redis, failing closed to coming_soon',
      err,
    )
    return CAMPUS_LANDING_MODE_DEFAULT
  }
}

export function isCampusLandingEnvPinned(): boolean {
  return readEnvOverride() !== null
}

/**
 * Persist mode in Redis. Throws if Redis is unavailable or mode is invalid.
 * Callers must enforce platform-admin authz.
 */
export async function setCampusLandingMode(mode: CampusLandingMode): Promise<void> {
  if (!isValidCampusLandingMode(mode)) {
    throw new Error(`Invalid Campus landing mode: ${String(mode)}`)
  }
  if (!isRedisConfigured()) {
    throw new Error('Redis is not configured — cannot persist Campus landing mode')
  }
  const redis = getRedis()
  await redis.set(REDIS_KEY_CAMPUS_LANDING_MODE, mode)
}
