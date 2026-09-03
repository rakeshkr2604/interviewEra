/**
 * Server-side VideoSDK REST helpers for Coach (management token only).
 */

export async function dispatchVideoSdkAgent(params: {
  token: string
  roomId: string
  agentId: string
  versionId: string
}): Promise<
  | { ok: true; status: number; body: string; usedUrl: string }
  | { ok: false; status: number; error: string }
> {
  const payload = JSON.stringify({
    agentId: params.agentId,
    meetingId: params.roomId,
    versionId: params.versionId,
  })
  const headers = {
    Authorization: params.token,
    'Content-Type': 'application/json',
  }
  const primaryUrl = 'https://api.videosdk.live/v2/agent/dispatch'
  const fallbackUrl = 'https://api.videosdk.live/v2/agent/general/dispatch'

  try {
    let res = await fetch(primaryUrl, { method: 'POST', headers, body: payload })
    let usedUrl = primaryUrl
    let text = await res.text()

    if (!res.ok) {
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers,
        body: payload,
      })
      const fallbackText = await fallbackRes.text()
      if (fallbackRes.ok) {
        res = fallbackRes
        usedUrl = fallbackUrl
        text = fallbackText
      } else {
        return {
          ok: false,
          status: 502,
          error: `Agent dispatch failed (${res.status}/${fallbackRes.status})`,
        }
      }
    }

    return { ok: true, status: res.status, body: text, usedUrl }
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error:
        err instanceof Error
          ? `Agent dispatch request failed: ${err.message}`
          : 'Agent dispatch request failed',
    }
  }
}

type VideoSdkSessionRow = {
  id?: string
  status?: string
  end?: string | null
}

async function listSessionsForRoom(
  token: string,
  roomId: string
): Promise<VideoSdkSessionRow[]> {
  const url = `https://api.videosdk.live/v2/sessions/?roomId=${encodeURIComponent(roomId)}&page=1&perPage=20`
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: token },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[coach:videosdk] list sessions failed', res.status, detail)
    return []
  }
  const data = (await res.json()) as { data?: VideoSdkSessionRow[] }
  return Array.isArray(data.data) ? data.data : []
}

function isSessionActive(row: VideoSdkSessionRow): boolean {
  if (row.end) return false
  const status = (row.status ?? '').toLowerCase()
  if (status === 'ended' || status === 'closed') return false
  return Boolean(row.id)
}

async function endMeetingSession(
  token: string,
  sessionId: string
): Promise<{ ended: boolean; alreadyGone: boolean }> {
  const res = await fetch(
    `https://api.videosdk.live/v1/meeting-sessions/${encodeURIComponent(sessionId)}/end`,
    {
      method: 'POST',
      headers: { Authorization: token },
    }
  )
  if (res.ok) return { ended: true, alreadyGone: false }
  // 4xx often means already ended / unknown — treat as idempotent success.
  if (res.status >= 400 && res.status < 500) {
    const detail = await res.text().catch(() => '')
    console.warn('[coach:videosdk] end session soft-fail', sessionId, res.status, detail)
    return { ended: false, alreadyGone: true }
  }
  const detail = await res.text().catch(() => '')
  console.error('[coach:videosdk] end session failed', sessionId, res.status, detail)
  return { ended: false, alreadyGone: false }
}

async function deactivateRoom(
  token: string,
  roomId: string
): Promise<{ ok: boolean; alreadyGone: boolean }> {
  const res = await fetch('https://api.videosdk.live/v2/rooms/deactivate', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomId }),
  })
  if (res.ok) return { ok: true, alreadyGone: false }
  if (res.status >= 400 && res.status < 500) {
    const detail = await res.text().catch(() => '')
    console.warn('[coach:videosdk] deactivate soft-fail', roomId, res.status, detail)
    return { ok: true, alreadyGone: true }
  }
  const detail = await res.text().catch(() => '')
  console.error('[coach:videosdk] deactivate failed', roomId, res.status, detail)
  return { ok: false, alreadyGone: false }
}

/**
 * Force-end any active sessions for the room, then deactivate the room.
 * Idempotent: already-ended / already-disabled → success.
 */
export async function forceEndCoachRoom(
  token: string,
  roomId: string
): Promise<{ ok: true; endedSessionIds: string[] } | { ok: false; error: string }> {
  try {
    const sessions = await listSessionsForRoom(token, roomId)
    const endedSessionIds: string[] = []
    for (const row of sessions) {
      if (!row.id || !isSessionActive(row)) continue
      const result = await endMeetingSession(token, row.id)
      if (result.ended || result.alreadyGone) endedSessionIds.push(row.id)
    }

    const deactivated = await deactivateRoom(token, roomId)
    if (!deactivated.ok) {
      return { ok: false, error: `Failed to deactivate room ${roomId}` }
    }

    return { ok: true, endedSessionIds }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `forceEndCoachRoom failed: ${err.message}`
          : 'forceEndCoachRoom failed',
    }
  }
}
