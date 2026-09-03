import { Receiver } from '@upstash/qstash'
import { NextResponse } from 'next/server'
import type { CoachEndCallbackBody } from '@/lib/coach/qstash'
import {
  clearPendingCoachSession,
  getPendingCoachSession,
  setPendingCoachSession,
} from '@/lib/coach/quota'
import { readVideoSdkEnv } from '@/lib/coach/videosdk-room'
import { forceEndCoachRoom } from '@/lib/coach/videosdk-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * QStash-signed hard-cutoff callback.
 *
 * Signature verification runs at request time (not module load) so
 * `next build` page-data collection does not require QSTASH_* env vars.
 * At runtime, missing keys → 503; invalid/missing signature → 403.
 */
export async function POST(request: Request): Promise<Response> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim()
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim()
  if (!currentSigningKey || !nextSigningKey) {
    console.error(
      '[coach:end-callback] QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY missing'
    )
    return NextResponse.json(
      { error: 'QStash signing keys not configured' },
      { status: 503 }
    )
  }

  const signature = request.headers.get('upstash-signature')
  if (!signature) {
    return NextResponse.json(
      { error: '`Upstash-Signature` header is missing' },
      { status: 403 }
    )
  }

  const rawBody = await request.text()
  const receiver = new Receiver({ currentSigningKey, nextSigningKey })
  const upstashRegion = request.headers.get('upstash-region') ?? undefined
  let isValid = false
  try {
    isValid = await receiver.verify({
      signature,
      body: rawBody,
      upstashRegion,
    })
  } catch (err) {
    console.warn('[coach:end-callback] signature verify threw', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let body: CoachEndCallbackBody
  try {
    body = JSON.parse(rawBody) as CoachEndCallbackBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = typeof body.userId === 'string' ? body.userId : ''
  const roomId = typeof body.roomId === 'string' ? body.roomId : ''
  if (!userId || !roomId) {
    return NextResponse.json({ error: 'userId and roomId required' }, { status: 400 })
  }

  const pending = await getPendingCoachSession(userId)
  // Stale or superseded room — no-op success (idempotent).
  if (!pending || pending.roomId !== roomId) {
    console.info('[coach:end-callback] no matching pending; no-op', {
      userId,
      roomId,
      reason: body.reason,
    })
    return NextResponse.json({ ok: true, noop: true, reason: 'no_matching_pending' })
  }

  const env = readVideoSdkEnv()
  if (!env.ok) {
    console.error('[coach:end-callback] missing VideoSDK env', env.error)
    // Return 500 so QStash retries — env misconfig is transient across deploys.
    return NextResponse.json({ error: env.error }, { status: 500 })
  }

  const ended = await forceEndCoachRoom(env.token, roomId)
  if (!ended.ok) {
    console.error('[coach:end-callback] force end failed', ended.error)
    return NextResponse.json({ error: ended.error }, { status: 502 })
  }

  // Clear cutoff id so a later remint does not try to cancel a delivered message.
  await setPendingCoachSession(userId, {
    ...pending,
    endMessageId: null,
  })

  // Abandon after never connecting: drop pending so the next mint is clean.
  if (body.reason === 'abandon' && !pending.connectedAt) {
    await clearPendingCoachSession(userId)
  }

  console.info('[coach:end-callback] room force-ended', {
    userId,
    roomId,
    reason: body.reason,
    endedSessionIds: ended.endedSessionIds,
  })

  return NextResponse.json({
    ok: true,
    endedSessionIds: ended.endedSessionIds,
    reason: body.reason ?? 'duration',
  })
}
