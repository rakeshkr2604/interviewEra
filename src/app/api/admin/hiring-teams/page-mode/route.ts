/**
 * GET/POST /api/admin/hiring-teams/page-mode
 *
 * Platform-admin runtime control of the public `/teams` landing:
 * `coming_soon` | `live` (Redis). Optional env pin `TEAMS_LANDING_MODE` overrides reads.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/admin/auth'
import { isRedisConfigured } from '@/lib/redis/client'
import {
  TEAMS_LANDING_MODES,
  getTeamsLandingMode,
  isTeamsLandingEnvPinned,
  setTeamsLandingMode,
} from '@/lib/hiring/teams-landing-mode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postSchema = z.object({
  mode: z.enum(TEAMS_LANDING_MODES),
})

export async function GET(): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin()
  if (error) return error

  try {
    const mode = await getTeamsLandingMode()
    return NextResponse.json({
      mode,
      redisConfigured: isRedisConfigured(),
      envPinned: isTeamsLandingEnvPinned(),
      defaultMode: 'coming_soon',
    })
  } catch (err) {
    console.error('[admin/hiring-teams/page-mode] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to retrieve Hiring Teams landing mode' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { admin, error } = await requirePlatformAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: parsed.error.issues },
      { status: 400 },
    )
  }

  if (isTeamsLandingEnvPinned()) {
    return NextResponse.json(
      {
        error:
          'TEAMS_LANDING_MODE env is set — Redis toggles are ignored until the env pin is removed.',
        mode: await getTeamsLandingMode(),
        envPinned: true,
      },
      { status: 409 },
    )
  }

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: 'Redis is not configured — cannot change Teams landing mode' },
      { status: 503 },
    )
  }

  try {
    await setTeamsLandingMode(parsed.data.mode)
    console.log(
      `[admin/hiring-teams/page-mode] admin=${admin.email} set mode=${parsed.data.mode}`,
    )
    return NextResponse.json({
      ok: true,
      mode: parsed.data.mode,
      message:
        parsed.data.mode === 'live'
          ? 'Hiring Teams full landing is now live on /teams.'
          : 'Hiring Teams Coming Soon page is now live on /teams.',
    })
  } catch (err) {
    console.error('[admin/hiring-teams/page-mode] POST failed', err)
    return NextResponse.json(
      { error: 'Failed to update Hiring Teams landing mode' },
      { status: 500 },
    )
  }
}
