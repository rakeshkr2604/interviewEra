import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { coachDurationSeconds } from '@/lib/coach/constants'
import {
  getPendingCoachSession,
  refundPendingCoachQuotaIfNeeded,
  setPendingCoachSession,
} from '@/lib/coach/quota'
import {
  COACH_HARD_CUTOFF_BUFFER_SECONDS,
  cancelCoachRoomEnd,
  scheduleCoachRoomEnd,
} from '@/lib/coach/qstash'
import { readVideoSdkEnv } from '@/lib/coach/videosdk-room'
import { dispatchVideoSdkAgent, forceEndCoachRoom } from '@/lib/coach/videosdk-session'

import { assertCoachAccess } from '@/lib/coach/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Server-side agent dispatch. Client never sees the management token or VideoSDK dispatch URLs.
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

  const roomId =
    body && typeof body === 'object' && 'roomId' in body
      ? (body as { roomId?: unknown }).roomId
      : undefined

  if (typeof roomId !== 'string' || !roomId.trim()) {
    return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
  }

  const pending = await getPendingCoachSession(user.id)
  if (!pending || pending.roomId !== roomId.trim()) {
    return NextResponse.json(
      { error: 'No active Coach session for this room. Start a new session.' },
      { status: 409 }
    )
  }

  if (pending.refunded) {
    return NextResponse.json(
      { error: 'This Coach session was cancelled. Start a new session.' },
      { status: 409 }
    )
  }

  const env = readVideoSdkEnv()
  if (!env.ok) {
    return NextResponse.json({ error: env.error }, { status: 500 })
  }

  const dispatched = await dispatchVideoSdkAgent({
    token: env.token,
    roomId: pending.roomId,
    agentId: env.agentId,
    versionId: env.versionId,
  })

  if (!dispatched.ok) {
    const { refunded } = await refundPendingCoachQuotaIfNeeded(user.id, pending)
    await forceEndCoachRoom(env.token, pending.roomId)
    if (pending.endMessageId) {
      await cancelCoachRoomEnd(pending.endMessageId)
    }
    return NextResponse.json(
      {
        error: dispatched.error,
        refunded,
      },
      { status: dispatched.status }
    )
  }

  if (pending.endMessageId) {
    await cancelCoachRoomEnd(pending.endMessageId)
  }

  const maxDurationSeconds = coachDurationSeconds(pending.durationMinutes)
  const scheduled = await scheduleCoachRoomEnd({
    userId: user.id,
    roomId: pending.roomId,
    delaySeconds: maxDurationSeconds + COACH_HARD_CUTOFF_BUFFER_SECONDS,
    reason: 'duration',
  })

  await setPendingCoachSession(user.id, {
    ...pending,
    connectedAt: new Date().toISOString(),
    endMessageId: scheduled.messageId,
  })

  return NextResponse.json({
    ok: true,
    roomId: pending.roomId,
    durationMinutes: pending.durationMinutes,
    maxDurationSeconds,
    hardCutoffScheduled: Boolean(scheduled.messageId),
  })
}
