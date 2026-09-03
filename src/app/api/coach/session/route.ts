import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  assertCoachCanStart,
  assertDurationAllowed,
  resolveCoachEntitlement,
} from '@/lib/coach/entitlement'
import { assertCoachAccess } from '@/lib/coach/access'
import { getCoachClientIp } from '@/lib/coach/ip'
import {
  checkCoachIpMintLimit,
  consumeCoachQuotaIfNeeded,
  getPendingCoachSession,
  refundCoachQuota,
  setPendingCoachSession,
} from '@/lib/coach/quota'
import {
  coachDurationSeconds,
  isCoachDurationMinutes,
  type CoachDurationMinutes,
} from '@/lib/coach/constants'
import {
  COACH_HARD_CUTOFF_BUFFER_SECONDS,
  COACH_MINT_ABANDON_GRACE_SECONDS,
  cancelCoachRoomEnd,
  scheduleCoachRoomEnd,
} from '@/lib/coach/qstash'
import { createVideoSdkRoom, readVideoSdkEnv } from '@/lib/coach/videosdk-room'
import { mintCoachJoinToken } from '@/lib/coach/videosdk-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Mint (or reset) a Coach room for the selected duration.
 * Returns a room-scoped join JWT — never the management VIDEOSDK_AUTH_TOKEN.
 * Daily quota is consumed once per pending window; Reset reuses the pending lease.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await assertCoachAccess(user)
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const durationRaw =
    body && typeof body === 'object' && 'durationMinutes' in body
      ? (body as { durationMinutes?: unknown }).durationMinutes
      : undefined

  if (!isCoachDurationMinutes(durationRaw)) {
    return NextResponse.json(
      { error: 'durationMinutes must be 3 or 5' },
      { status: 400 }
    )
  }
  const durationMinutes: CoachDurationMinutes = durationRaw

  const env = readVideoSdkEnv()
  if (!env.ok) {
    return NextResponse.json({ error: env.error }, { status: 500 })
  }

  const entitlement = await resolveCoachEntitlement(user.id)
  const pending = await getPendingCoachSession(user.id)
  const reusePending = Boolean(
    pending?.quotaConsumed &&
      !pending.refunded &&
      pending.durationMinutes === durationMinutes
  )

  const durationGate = assertDurationAllowed(entitlement, durationMinutes)
  if (!durationGate.ok) {
    return NextResponse.json(
      {
        error: durationGate.error,
        upgradeUrl: durationGate.upgradeUrl ?? entitlement.upgradeUrl,
      },
      { status: durationGate.status }
    )
  }

  if (!reusePending) {
    const startGate = assertCoachCanStart(entitlement)
    if (!startGate.ok) {
      return NextResponse.json(
        {
          error: startGate.error,
          upgradeUrl: startGate.upgradeUrl ?? entitlement.upgradeUrl,
        },
        {
          status: startGate.status,
          headers: {
            'Retry-After': String(entitlement.quota.resetInSeconds || 60),
          },
        }
      )
    }
  }

  const ip = getCoachClientIp(request)
  const ipGate = await checkCoachIpMintLimit(ip)
  if (!ipGate.ok) {
    return NextResponse.json(
      { error: ipGate.error },
      {
        status: ipGate.status,
        headers: { 'Retry-After': String(ipGate.resetInSeconds) },
      }
    )
  }

  const quota = await consumeCoachQuotaIfNeeded({
    userId: user.id,
    isPaid: entitlement.isPaid,
    reusePending,
  })
  if (!quota.ok) {
    return NextResponse.json(
      { error: quota.error, upgradeUrl: entitlement.upgradeUrl },
      {
        status: quota.status,
        headers: { 'Retry-After': String(quota.resetInSeconds) },
      }
    )
  }

  const room = await createVideoSdkRoom(env.token)
  if (!room.ok) {
    if (quota.consumedNew) {
      const refund = await refundCoachQuota({
        userId: user.id,
        isPaid: entitlement.isPaid,
      })
      if (!refund.ok) {
        console.error('[coach:session] room create failed and refund failed', refund.error)
      }
    }
    return NextResponse.json({ error: room.error }, { status: room.status })
  }

  const joinToken = mintCoachJoinToken(room.roomId)
  if (!joinToken.ok) {
    if (quota.consumedNew) {
      await refundCoachQuota({ userId: user.id, isPaid: entitlement.isPaid })
    }
    return NextResponse.json({ error: joinToken.error }, { status: 500 })
  }

  if (pending?.endMessageId) {
    await cancelCoachRoomEnd(pending.endMessageId)
  }

  const maxDurationSeconds = coachDurationSeconds(durationMinutes)
  const abandonDelay =
    maxDurationSeconds + COACH_MINT_ABANDON_GRACE_SECONDS + COACH_HARD_CUTOFF_BUFFER_SECONDS
  const scheduled = await scheduleCoachRoomEnd({
    userId: user.id,
    roomId: room.roomId,
    delaySeconds: abandonDelay,
    reason: 'abandon',
  })

  await setPendingCoachSession(user.id, {
    roomId: room.roomId,
    durationMinutes,
    quotaConsumed: true,
    isPaid: entitlement.isPaid,
    createdAt: new Date().toISOString(),
    endMessageId: scheduled.messageId,
    refunded: false,
  })

  return NextResponse.json({
    token: joinToken.token,
    roomId: room.roomId,
    durationMinutes,
    maxDurationSeconds,
    isPaid: entitlement.isPaid,
    reusedQuota: reusePending,
  })
}
