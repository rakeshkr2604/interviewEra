export type VideoSdkRoomConfig = {
  token: string
  roomId: string
  agentId: string
  versionId: string
}

export function readVideoSdkEnv():
  | { ok: true; token: string; agentId: string; versionId: string }
  | { ok: false; error: string } {
  const token = process.env.VIDEOSDK_AUTH_TOKEN?.trim()
  const agentId = process.env.VIDEOSDK_AGENT_ID?.trim()
  const versionId = process.env.VIDEOSDK_VERSION_ID?.trim()
  if (!token || !agentId || !versionId) {
    return {
      ok: false,
      error:
        'Missing VideoSDK env: VIDEOSDK_AUTH_TOKEN, VIDEOSDK_AGENT_ID, and/or VIDEOSDK_VERSION_ID',
    }
  }
  return { ok: true, token, agentId, versionId }
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
