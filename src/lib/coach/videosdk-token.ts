import { createHmac } from 'node:crypto'

/**
 * VideoSDK JWT minting for the AI Interview Coach.
 *
 * Management tokens (room creation, agent dispatch) are minted fresh per-request via
 * mintVideoSdkManagementToken() using VIDEOSDK_API_KEY + VIDEOSDK_SECRET.
 * Client join tokens are room-scoped (version 2 + roomId + roles:['rtc']) via mintCoachJoinToken().
 * Neither token is ever exposed to the client as a raw credential.
 */

const JOIN_TOKEN_TTL_SECONDS = 60 * 60 // covers 5m session + join slack
/** Short-lived; minted fresh per-request for management REST calls. */
const MGMT_TOKEN_TTL_SECONDS = 5 * 60

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

export function readVideoSdkSigningEnv():
  | { ok: true; apiKey: string; secret: string }
  | { ok: false; error: string } {
  const apiKey = process.env.VIDEOSDK_API_KEY?.trim()
  const secret = process.env.VIDEOSDK_SECRET?.trim()
  if (!apiKey || !secret) {
    return {
      ok: false,
      error:
        'Missing VideoSDK signing env: VIDEOSDK_API_KEY and VIDEOSDK_SECRET (required to mint room-scoped join tokens)',
    }
  }
  return { ok: true, apiKey, secret }
}

/**
 * Short-lived management JWT for VideoSDK REST API calls (room creation, agent dispatch).
 * Uses the same VIDEOSDK_API_KEY + VIDEOSDK_SECRET as join tokens, but without roomId/rtc
 * restrictions so it can call any management endpoint.
 * Minted fresh per-request to avoid expiry — eliminates the static VIDEOSDK_AUTH_TOKEN.
 */
export function mintVideoSdkManagementToken():
  | { ok: true; token: string }
  | { ok: false; error: string } {
  const env = readVideoSdkSigningEnv()
  if (!env.ok) return env

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    apikey: env.apiKey,
    permissions: ['allow_join', 'allow_mod'],
    version: 2,
    iat: now,
    exp: now + MGMT_TOKEN_TTL_SECONDS,
  }

  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`
  const signature = createHmac('sha256', env.secret)
    .update(signingInput)
    .digest('base64url')

  return { ok: true, token: `${signingInput}.${signature}` }
}

/** Room-scoped join-only JWT for MeetingProvider — never the management token. */
export function mintCoachJoinToken(roomId: string):
  | { ok: true; token: string; expiresInSeconds: number }
  | { ok: false; error: string } {
  const env = readVideoSdkSigningEnv()
  if (!env.ok) return env

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    apikey: env.apiKey,
    permissions: ['allow_join'],
    version: 2,
    roomId,
    roles: ['rtc'],
    iat: now,
    exp: now + JOIN_TOKEN_TTL_SECONDS,
  }

  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`
  const signature = createHmac('sha256', env.secret)
    .update(signingInput)
    .digest('base64url')

  return {
    ok: true,
    token: `${signingInput}.${signature}`,
    expiresInSeconds: JOIN_TOKEN_TTL_SECONDS,
  }
}
