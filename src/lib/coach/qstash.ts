import { Client } from '@upstash/qstash'
import { getBaseUrl } from '@/lib/server/get-base-url'

/** Soft UX timer is client-side; this buffer is added on top of maxDuration for the hard cut. */
export const COACH_HARD_CUTOFF_BUFFER_SECONDS = 5

/**
 * Join/connect grace added when scheduling the mint-time abandon cutoff so a
 * user who takes a minute to join is not cut before the practice window starts.
 * Precise duration enforcement is rescheduled at connect success.
 */
export const COACH_MINT_ABANDON_GRACE_SECONDS = 15 * 60

export type CoachEndCallbackBody = {
  userId: string
  roomId: string
  reason: 'duration' | 'abandon'
}

function readQstashToken(): string | null {
  return process.env.QSTASH_TOKEN?.trim() || null
}

export function isQstashConfigured(): boolean {
  return Boolean(
    readQstashToken() &&
      process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() &&
      process.env.QSTASH_NEXT_SIGNING_KEY?.trim()
  )
}

function getClient(): Client | null {
  const token = readQstashToken()
  if (!token) return null
  return new Client({ token })
}

export async function scheduleCoachRoomEnd(params: {
  userId: string
  roomId: string
  delaySeconds: number
  reason: CoachEndCallbackBody['reason']
}): Promise<{ messageId: string | null; skipped: boolean }> {
  const client = getClient()
  if (!client) {
    console.warn(
      '[coach:qstash] QSTASH_TOKEN missing — skipping server hard-cutoff schedule (client soft timer only)'
    )
    return { messageId: null, skipped: true }
  }

  const delaySeconds = Math.max(1, Math.ceil(params.delaySeconds))
  const url = `${getBaseUrl()}/api/coach/session/end-callback`

  // Forwarded by QStash onto the callback request so Deployment Protection
  // does not redirect the delivery to Vercel's login wall.
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim()
  const headers = bypassSecret
    ? { 'x-vercel-protection-bypass': bypassSecret }
    : undefined

  try {
    const res = await client.publishJSON({
      url,
      body: {
        userId: params.userId,
        roomId: params.roomId,
        reason: params.reason,
      } satisfies CoachEndCallbackBody,
      // QStash accepts delay as seconds (number). Minimum practical unit is 1s.
      delay: delaySeconds,
      retries: 2,
      ...(headers ? { headers } : {}),
    })
    const messageId = Array.isArray(res) ? res[0]?.messageId : res.messageId
    return { messageId: messageId ?? null, skipped: false }
  } catch (err) {
    console.error('[coach:qstash] schedule failed', err)
    return { messageId: null, skipped: true }
  }
}

export async function cancelCoachRoomEnd(
  messageId: string | null | undefined
): Promise<void> {
  if (!messageId) return
  const client = getClient()
  if (!client) return
  try {
    await client.messages.delete(messageId)
  } catch (err) {
    // Already delivered or unknown — fine for idempotent cancel.
    console.warn('[coach:qstash] cancel message soft-fail', messageId, err)
  }
}
