import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forceEndCoachRoom } from './videosdk-session'
import { mintCoachJoinToken } from './videosdk-token'

describe('coach videosdk force end (hard cutoff)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('ends active sessions then deactivates the room', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'sess-active', status: 'ongoing', end: null },
            { id: 'sess-done', status: 'ended', end: '2026-01-01T00:00:00.000Z' },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, text: async () => '' }) // end active
      .mockResolvedValueOnce({ ok: true, json: async () => ({ disabled: true }) }) // deactivate

    const result = await forceEndCoachRoom('mgmt-token', 'room-1')
    expect(result).toEqual({ ok: true, endedSessionIds: ['sess-active'] })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/v2/sessions/?roomId=room-1'),
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.videosdk.live/v1/meeting-sessions/sess-active/end',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api.videosdk.live/v2/rooms/deactivate',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('is idempotent when sessions are already gone and deactivate returns 4xx', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'already disabled',
      })

    const result = await forceEndCoachRoom('mgmt-token', 'room-gone')
    expect(result).toEqual({ ok: true, endedSessionIds: [] })
  })
})

describe('coach join token', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('mints a room-scoped rtc join JWT (not a blank management passthrough)', () => {
    vi.stubEnv('VIDEOSDK_API_KEY', 'test-api-key')
    vi.stubEnv('VIDEOSDK_SECRET', 'test-secret')

    const minted = mintCoachJoinToken('abc-xyzw-lmno')
    expect(minted.ok).toBe(true)
    if (!minted.ok) return

    const [, payloadB64] = minted.token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      roomId: string
      roles: string[]
      permissions: string[]
      version: number
      apikey: string
    }
    expect(payload.apikey).toBe('test-api-key')
    expect(payload.roomId).toBe('abc-xyzw-lmno')
    expect(payload.roles).toEqual(['rtc'])
    expect(payload.permissions).toEqual(['allow_join'])
    expect(payload.version).toBe(2)
  })
})
