import { createHmac } from 'node:crypto'

/**
 * Mint room-scoped VideoSDK JWTs for the candidate client.
 *
 * Per VideoSDK auth docs: version 2 + roomId + roles:['rtc'] limits the token to
 * joining that room (no server REST / room-create / agent-dispatch).
 * Management calls continue to use VIDEOSDK_AUTH_TOKEN server-side only.
 */

const JOIN_TOKEN_TTL_SECONDS = 60 * 60 // covers 5m session + join slack

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
