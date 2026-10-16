/**
 * Runtime gate for the public `/teams` (Hiring Teams) marketing landing.
 *
 * Modes:
 * - `coming_soon` — Coming Soon shell (default / fail-closed while product unfinished)
 * - `live` — full HiringTeamsLandingClient (for demos / when product is ready)
 *
 * Precedence: env `TEAMS_LANDING_MODE` (if valid) → Redis → default `coming_soon`.
 * Mirrors Coach access: zero-deploy flip from Platform Admin UI.
 */

import { getRedis, isRedisConfigured } from '@/lib/redis/client'

export const TEAMS_LANDING_MODES = ['coming_soon', 'live'] as const
export type TeamsLandingMode = (typeof TEAMS_LANDING_MODES)[number]

export const REDIS_KEY_TEAMS_LANDING_MODE = 'product:teams:landing_mode'

export const TEAMS_LANDING_MODE_DEFAULT: TeamsLandingMode = 'coming_soon'

export function isValidTeamsLandingMode(value: unknown): value is TeamsLandingMode {
  return (
    typeof value === 'string' &&
    (TEAMS_LANDING_MODES as readonly string[]).includes(value)
  )
}

function readEnvOverride(): TeamsLandingMode | null {
  const raw = process.env.TEAMS_LANDING_MODE?.trim().toLowerCase()
  if (isValidTeamsLandingMode(raw)) return raw
  return null
}

/**
 * Resolve which `/teams` surface to show.
 * Env override wins (emergency / staging pin). Otherwise Redis; missing Redis → coming_soon.
 */
export async function getTeamsLandingMode(): Promise<TeamsLandingMode> {
  const envMode = readEnvOverride()
  if (envMode) return envMode

  if (!isRedisConfigured()) {
    return TEAMS_LANDING_MODE_DEFAULT
  }

  try {
    const redis = getRedis()
    const raw = await redis.get<string>(REDIS_KEY_TEAMS_LANDING_MODE)
    if (isValidTeamsLandingMode(raw)) return raw
    return TEAMS_LANDING_MODE_DEFAULT
  } catch (err) {
    console.error(
      '[hiring:teams-landing] failed to read mode from Redis, failing closed to coming_soon',
      err,
    )
    return TEAMS_LANDING_MODE_DEFAULT
  }
}

export function isTeamsLandingEnvPinned(): boolean {
  return readEnvOverride() !== null
}

/**
 * Persist mode in Redis. Throws if Redis is unavailable or mode is invalid.
 * Callers must enforce platform-admin authz.
 */
export async function setTeamsLandingMode(mode: TeamsLandingMode): Promise<void> {
  if (!isValidTeamsLandingMode(mode)) {
    throw new Error(`Invalid Teams landing mode: ${String(mode)}`)
  }
  if (!isRedisConfigured()) {
    throw new Error('Redis is not configured — cannot persist Teams landing mode')
  }
  const redis = getRedis()
  await redis.set(REDIS_KEY_TEAMS_LANDING_MODE, mode)
}
