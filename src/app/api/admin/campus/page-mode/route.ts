/**
 * GET/POST /api/admin/campus/page-mode
 *
 * Platform-admin runtime control of the public `/campus` landing:
 * `coming_soon` | `live` (Redis). Optional env pin `CAMPUS_LANDING_MODE` overrides reads.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformAdmin } from '@/lib/admin/auth'
import { isRedisConfigured } from '@/lib/redis/client'
import {
  CAMPUS_LANDING_MODES,
  getCampusLandingMode,
  isCampusLandingEnvPinned,
  setCampusLandingMode,
} from '@/lib/campus/campus-landing-mode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postSchema = z.object({
  mode: z.enum(CAMPUS_LANDING_MODES),
})

export async function GET(): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin()
  if (error) return error

  try {
    const mode = await getCampusLandingMode()
    return NextResponse.json({
      mode,
      redisConfigured: isRedisConfigured(),
      envPinned: isCampusLandingEnvPinned(),
      defaultMode: 'coming_soon',
    })
  } catch (err) {
    console.error('[admin/campus/page-mode] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to retrieve Campus landing mode' },
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

  if (isCampusLandingEnvPinned()) {
    return NextResponse.json(
      {
        error:
          'CAMPUS_LANDING_MODE env is set — Redis toggles are ignored until the env pin is removed.',
        mode: await getCampusLandingMode(),
        envPinned: true,
      },
      { status: 409 },
    )
  }

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: 'Redis is not configured — cannot change Campus landing mode' },
      { status: 503 },
    )
  }

  try {
    await setCampusLandingMode(parsed.data.mode)
    console.log(
      `[admin/campus/page-mode] admin=${admin.email} set mode=${parsed.data.mode}`,
    )
    return NextResponse.json({
      ok: true,
      mode: parsed.data.mode,
      message:
        parsed.data.mode === 'live'
          ? 'Campus full landing is now live on /campus.'
          : 'Campus Coming Soon page is now live on /campus.',
    })
  } catch (err) {
    console.error('[admin/campus/page-mode] POST failed', err)
    return NextResponse.json(
      { error: 'Failed to update Campus landing mode' },
      { status: 500 },
    )
  }
}
