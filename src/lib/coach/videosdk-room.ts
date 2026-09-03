import { mintVideoSdkManagementToken } from './videosdk-token'

export type VideoSdkRoomConfig = {
  token: string
  roomId: string
  agentId: string
  versionId: string
}

/**
 * Read VideoSDK agent config and mint a fresh short-lived management JWT.
 *
 * The static VIDEOSDK_AUTH_TOKEN (dashboard temporary token) has been replaced
 * with dynamically-minted tokens to avoid production expiry (4002 errors).
 * The management JWT is signed with VIDEOSDK_API_KEY + VIDEOSDK_SECRET — the
 * same credentials already used by mintCoachJoinToken — but without the roomId
 * or roles:rtc restrictions, so it can call any management REST endpoint.
 */
export function readVideoSdkEnv():
  | { ok: true; token: string; agentId: string; versionId: string }
  | { ok: false; error: string } {
  const agentId = process.env.VIDEOSDK_AGENT_ID?.trim()
  const versionId = process.env.VIDEOSDK_VERSION_ID?.trim()
  if (!agentId || !versionId) {
    return {
      ok: false,
      error: 'Missing VideoSDK env: VIDEOSDK_AGENT_ID and/or VIDEOSDK_VERSION_ID',
    }
  }
  const minted = mintVideoSdkManagementToken()
  if (!minted.ok) {
    return { ok: false, error: `VideoSDK management token: ${minted.error}` }
  }
  return { ok: true, token: minted.token, agentId, versionId }
}

export async function createVideoSdkRoom(token: string): Promise<
  | { ok: true; roomId: string }
  | { ok: false; status: number; error: string }
> {
  try {
    const res = await fetch('https://api.videosdk.live/v2/rooms', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const detail = await res.text()
      return {
        ok: false,
        status: 502,
        error: `VideoSDK room creation failed (${res.status}): ${detail}`,
      }
    }

    const data = (await res.json()) as { roomId?: string }
    if (!data.roomId) {
      return {
        ok: false,
        status: 502,
        error: 'VideoSDK room creation returned no roomId',
      }
    }

    return { ok: true, roomId: data.roomId }
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error:
        err instanceof Error
          ? `VideoSDK room creation request failed: ${err.message}`
          : 'VideoSDK room creation request failed',
    }
  }
}
