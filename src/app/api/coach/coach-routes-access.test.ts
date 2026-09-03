import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockUser: { id: string; email?: string } | null = null
let mockAuthError: Error | null = null

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockUser },
        error: mockAuthError,
      })),
    },
  })),
}))

let mockAccessAllowed = true
let mockAccessStatus: 401 | 403 = 403
let mockAccessError = 'AI Interview Coach is currently unavailable.'

vi.mock('@/lib/coach/access', () => ({
  assertCoachAccess: vi.fn(async () => {
    if (!mockAccessAllowed) {
      return {
        allowed: false,
        status: mockAccessStatus,
        error: mockAccessError,
        mode: 'disabled',
      }
    }
    return { allowed: true, mode: 'public' }
  }),
}))

vi.mock('@/lib/coach/entitlement', () => ({
  resolveCoachEntitlement: vi.fn(async () => ({
    isPaid: false,
    quota: { resetInSeconds: 60 },
    upgradeUrl: '/pricing',
  })),
  assertCoachCanStart: vi.fn(() => ({ ok: true })),
  assertDurationAllowed: vi.fn(() => ({ ok: true })),
}))

vi.mock('@/lib/coach/videosdk-room', () => ({
  readVideoSdkEnv: vi.fn(() => ({ ok: true, token: 'tok', agentId: 'ag', versionId: 'ver' })),
  createVideoSdkRoom: vi.fn(async () => ({ ok: true, roomId: 'room-123' })),
}))

vi.mock('@/lib/coach/videosdk-token', () => ({
  mintCoachJoinToken: vi.fn(() => ({ ok: true, token: 'jwt-123', expiresInSeconds: 3600 })),
}))

vi.mock('@/lib/coach/videosdk-session', () => ({
  dispatchVideoSdkAgent: vi.fn(async () => ({ ok: true })),
  forceEndCoachRoom: vi.fn(async () => ({ ok: true })),
}))

vi.mock('@/lib/coach/quota', () => ({
  getPendingCoachSession: vi.fn(async () => ({
    roomId: 'room-123',
    durationMinutes: 3,
    quotaConsumed: true,
    isPaid: false,
  })),
  setPendingCoachSession: vi.fn(async () => {}),
  refundPendingCoachQuotaIfNeeded: vi.fn(async () => ({ refunded: false })),
  consumeCoachQuotaIfNeeded: vi.fn(async () => ({ ok: true, consumedNew: false })),
  refundCoachQuota: vi.fn(async () => ({ ok: true })),
  checkCoachIpMintLimit: vi.fn(async () => ({ ok: true })),
}))

vi.mock('@/lib/coach/qstash', () => ({
  COACH_HARD_CUTOFF_BUFFER_SECONDS: 5,
  COACH_MINT_ABANDON_GRACE_SECONDS: 900,
  cancelCoachRoomEnd: vi.fn(async () => {}),
  scheduleCoachRoomEnd: vi.fn(async () => ({ messageId: 'msg-123', skipped: false })),
}))

import { GET as entitlementGET } from './entitlement/route'
import { POST as sessionPOST } from './session/route'
import { POST as connectPOST } from './session/connect/route'

describe('Coach API Routes Access Gate', () => {
  beforeEach(() => {
    mockUser = { id: 'user-123', email: 'test@example.com' }
    mockAuthError = null
    mockAccessAllowed = true
    mockAccessStatus = 403
    mockAccessError = 'AI Interview Coach is currently unavailable.'
    vi.clearAllMocks()
  })

  describe('GET /api/coach/entitlement', () => {
    it('returns 401 when unauthenticated', async () => {
      mockUser = null
      const res = await entitlementGET()
      expect(res.status).toBe(401)
    })

    it('returns 403 when access is denied by assertCoachAccess', async () => {
      mockAccessAllowed = false
      mockAccessStatus = 403
      mockAccessError = 'AI Interview Coach is restricted to platform administrators.'

      const res = await entitlementGET()
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe(mockAccessError)
    })

    it('returns 200 when access is allowed', async () => {
      mockAccessAllowed = true
      const res = await entitlementGET()
      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/coach/session', () => {
    it('returns 401 when unauthenticated', async () => {
      mockUser = null
      const req = new Request('http://localhost/api/coach/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: 3 }),
      })
      const res = await sessionPOST(req)
      expect(res.status).toBe(401)
    })

    it('returns 403 when access is denied by assertCoachAccess', async () => {
      mockAccessAllowed = false
      mockAccessStatus = 403
      mockAccessError = 'AI Interview Coach is currently unavailable.'

      const req = new Request('http://localhost/api/coach/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: 3 }),
      })
      const res = await sessionPOST(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe(mockAccessError)
    })

    it('does NOT call VideoSDK, QStash, or quota when access is denied', async () => {
      const { createVideoSdkRoom } = await import('@/lib/coach/videosdk-room')
      const { scheduleCoachRoomEnd } = await import('@/lib/coach/qstash')
      const { consumeCoachQuotaIfNeeded } = await import('@/lib/coach/quota')

      mockAccessAllowed = false
      const req = new Request('http://localhost/api/coach/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: 3 }),
      })
      await sessionPOST(req)

      expect(createVideoSdkRoom).not.toHaveBeenCalled()
      expect(scheduleCoachRoomEnd).not.toHaveBeenCalled()
      expect(consumeCoachQuotaIfNeeded).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/coach/session/connect', () => {
    it('returns 401 when unauthenticated', async () => {
      mockUser = null
      const req = new Request('http://localhost/api/coach/session/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: 'room-123' }),
      })
      const res = await connectPOST(req)
      expect(res.status).toBe(401)
    })

    it('returns 403 when access is denied by assertCoachAccess', async () => {
      mockAccessAllowed = false
      mockAccessStatus = 403
      mockAccessError = 'AI Interview Coach is currently in private preview for selected testers.'

      const req = new Request('http://localhost/api/coach/session/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: 'room-123' }),
      })
      const res = await connectPOST(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe(mockAccessError)
    })

    it('does NOT dispatch VideoSDK agent when access is denied', async () => {
      const { dispatchVideoSdkAgent } = await import('@/lib/coach/videosdk-session')

      mockAccessAllowed = false
      const req = new Request('http://localhost/api/coach/session/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: 'room-123' }),
      })
      await connectPOST(req)

      expect(dispatchVideoSdkAgent).not.toHaveBeenCalled()
    })
  })
})
