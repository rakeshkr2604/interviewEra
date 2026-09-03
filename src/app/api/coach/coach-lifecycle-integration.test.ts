import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// In-memory Redis store for testing lifecycle
const redisStore = new Map<string, unknown>()

const mockRedis = {
  get: vi.fn(async (key: string) => {
    const val = redisStore.get(key)
    return val !== undefined ? val : null
  }),
  set: vi.fn(async (key: string, value: unknown) => {
    redisStore.set(key, value)
    return 'OK'
  }),
  del: vi.fn(async (key: string) => {
    redisStore.delete(key)
    return 1
  }),
  ttl: vi.fn(async (key: string) => (redisStore.has(key) ? 3600 : -2)),
  decr: vi.fn(async (key: string) => {
    const val = Number(redisStore.get(key) ?? 0) - 1
    redisStore.set(key, val)
    return val
  }),
  smembers: vi.fn(async (key: string) => {
    const val = redisStore.get(key)
    return Array.isArray(val) ? val : []
  }),
  sismember: vi.fn(async (key: string, member: string) => {
    const val = redisStore.get(key)
    return Array.isArray(val) && val.includes(member) ? 1 : 0
  }),
  sadd: vi.fn(async (key: string, ...members: string[]) => {
    const existing = (redisStore.get(key) as string[]) || []
    const updated = Array.from(new Set([...existing, ...members]))
    redisStore.set(key, updated)
    return members.length
  }),
  srem: vi.fn(async (key: string, ...members: string[]) => {
    const existing = (redisStore.get(key) as string[]) || []
    const updated = existing.filter((m) => !members.includes(m))
    redisStore.set(key, updated)
    return 1
  }),
}

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, resetInSeconds: 60 })),
}))

vi.mock('@/lib/redis/client', () => ({
  isRedisConfigured: () => true,
  getRedis: () => mockRedis,
  default: () => mockRedis,
}))

let currentAuthUser: { id: string; email: string } | null = null

const mockSupabase = {
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: currentAuthUser },
      error: currentAuthUser ? null : new Error('No session'),
    })),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: { plan_tier: 'free', role: 'candidate' },
          error: null,
        }),
        maybeSingle: async () => ({
          data: { plan_tier: 'free', role: 'candidate' },
          error: null,
        }),
      }),
    }),
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
  createServiceClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/admin/auth', () => ({
  isPlatformAdminUser: vi.fn(async (_id: string, email?: string | null) => {
    return email === 'admin@interviewera.com'
  }),
}))

// Mock VideoSDK REST calls to track side effects
const mockCreateRoom = vi.fn(async () => ({ ok: true as const, roomId: 'vsdk_room_123' }))
const mockDispatchAgent = vi.fn(async () => ({
  ok: true as const,
  status: 200,
  body: '{"ok":true}',
  usedUrl: 'https://api.videosdk.live/v2/agent/dispatch',
}))
const mockForceEndRoom = vi.fn(async () => ({
  ok: true as const,
  endedSessionIds: ['sess_1'],
}))

vi.mock('@/lib/coach/videosdk-room', () => ({
  readVideoSdkEnv: () => ({
    ok: true,
    token: 'mock-management-token',
    agentId: 'agent-rohan',
    versionId: 'v1',
  }),
  createVideoSdkRoom: () => mockCreateRoom(),
}))

vi.mock('@/lib/coach/videosdk-session', () => ({
  dispatchVideoSdkAgent: () => mockDispatchAgent(),
  forceEndCoachRoom: () => mockForceEndRoom(),
}))

// Mock QStash to verify cutoff scheduling
const mockScheduleRoomEnd = vi.fn(async () => ({ messageId: 'msg_qstash_123', skipped: false }))
const mockCancelRoomEnd = vi.fn(async () => {})

vi.mock('@/lib/coach/qstash', () => ({
  COACH_HARD_CUTOFF_BUFFER_SECONDS: 5,
  COACH_MINT_ABANDON_GRACE_SECONDS: 900,
  scheduleCoachRoomEnd: () => mockScheduleRoomEnd(),
  cancelCoachRoomEnd: () => mockCancelRoomEnd(),
}))

import { GET as entitlementHandler } from './entitlement/route'
import { POST as sessionHandler } from './session/route'
import { POST as connectHandler } from './session/connect/route'

describe('AI Interview Coach — Complete Authentication & Session Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redisStore.clear()
    currentAuthUser = null

    // Configure signing env
    process.env.VIDEOSDK_API_KEY = 'test-api-key'
    process.env.VIDEOSDK_SECRET = 'test-api-secret-key-123456789012' // gitleaks:allow

    // Set default coach access mode to allowlist
    redisStore.set('coach:config:mode', 'allowlist')
    redisStore.set('coach:allowlist:emails', ['candidate@interviewera.com'])
  })

  // ─── 1. Complete Happy Path Integration ───
  it('executes the full authentication → authorization → entitlement → session → VideoSDK → agent connect chain', async () => {
    // A. Authenticated & Allowlisted Candidate
    currentAuthUser = { id: 'cand-001', email: 'candidate@interviewera.com' }

    // B. Check Entitlement
    const entRes = await entitlementHandler()
    expect(entRes.status).toBe(200)
    const entBody = await entRes.json()
    expect(entBody.canStart).toBe(true)
    expect(entBody.allowedDurations).toContain(3)

    // C. Mint Session (Room creation + Token generation)
    const mintReq = new NextRequest('http://localhost/api/coach/session', {
      method: 'POST',
      body: JSON.stringify({ durationMinutes: 3 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const sessionRes = await sessionHandler(mintReq)
    expect(sessionRes.status).toBe(200)
    const sessionBody = await sessionRes.json()

    // VideoSDK Room created
    expect(mockCreateRoom).toHaveBeenCalledTimes(1)
    expect(sessionBody.roomId).toBe('vsdk_room_123')

    // Room-scoped join JWT returned (not management token)
    expect(sessionBody.token).toBeDefined()
    expect(sessionBody.token).not.toBe('mock-management-token')

    // Decode and verify the JWT claims
    const [_headerB64, payloadB64] = sessionBody.token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    expect(payload.apikey).toBe('test-api-key')
    expect(payload.roomId).toBe('vsdk_room_123')
    expect(payload.roles).toEqual(['rtc'])
    expect(payload.permissions).toEqual(['allow_join'])
    expect(payload.version).toBe(2)

    // QStash abandon cutoff was scheduled
    expect(mockScheduleRoomEnd).toHaveBeenCalledTimes(1)

    // D. Connect Agent
    const connectReq = new NextRequest('http://localhost/api/coach/session/connect', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'vsdk_room_123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const connectRes = await connectHandler(connectReq)
    expect(connectRes.status).toBe(200)
    const connectBody = await connectRes.json()
    expect(connectBody.ok).toBe(true)
    expect(connectBody.roomId).toBe('vsdk_room_123')

    // Agent dispatch occurred server-side
    expect(mockDispatchAgent).toHaveBeenCalledTimes(1)

    // Abandon message cancelled, precise duration cutoff scheduled
    expect(mockCancelRoomEnd).toHaveBeenCalledTimes(1)
  })

  // ─── 2. Unauthenticated User (401) with Zero Side Effects ───
  it('rejects unauthenticated requests at all endpoints with 401 and zero side effects', async () => {
    currentAuthUser = null // No active Supabase cookie session

    // Entitlement
    const entRes = await entitlementHandler()
    expect(entRes.status).toBe(401)

    // Session Mint
    const sessionReq = new NextRequest('http://localhost/api/coach/session', {
      method: 'POST',
      body: JSON.stringify({ durationMinutes: 3 }),
    })
    const sessionRes = await sessionHandler(sessionReq)
    expect(sessionRes.status).toBe(401)

    // Agent Connect
    const connectReq = new NextRequest('http://localhost/api/coach/session/connect', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'vsdk_room_123' }),
    })
    const connectRes = await connectHandler(connectReq)
    expect(connectRes.status).toBe(401)

    // Verify side effects were strictly blocked
    expect(mockCreateRoom).not.toHaveBeenCalled()
    expect(mockDispatchAgent).not.toHaveBeenCalled()
    expect(mockScheduleRoomEnd).not.toHaveBeenCalled()
  })

  // ─── 3. Authenticated but Unauthorized User (403) with Zero Side Effects ───
  it('rejects authenticated users who are not authorized by Coach access mode with 403 and zero side effects', async () => {
    // Mode is allowlist, but user is NOT in the allowlist
    currentAuthUser = { id: 'unauth-user', email: 'stranger@example.com' }

    // Entitlement
    const entRes = await entitlementHandler()
    expect(entRes.status).toBe(403)

    // Session Mint
    const sessionReq = new NextRequest('http://localhost/api/coach/session', {
      method: 'POST',
      body: JSON.stringify({ durationMinutes: 3 }),
    })
    const sessionRes = await sessionHandler(sessionReq)
    expect(sessionRes.status).toBe(403)

    // Agent Connect
    const connectReq = new NextRequest('http://localhost/api/coach/session/connect', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'vsdk_room_123' }),
    })
    const connectRes = await connectHandler(connectReq)
    expect(connectRes.status).toBe(403)

    // Verify side effects were strictly blocked
    expect(mockCreateRoom).not.toHaveBeenCalled()
    expect(mockDispatchAgent).not.toHaveBeenCalled()
    expect(mockScheduleRoomEnd).not.toHaveBeenCalled()
  })

  // ─── 4. Client Identity Injection / Impersonation Immunity ───
  it('ignores any client-supplied userId or email in request body and strictly binds to server session', async () => {
    // Legitimate attacker session
    currentAuthUser = { id: 'attacker-1', email: 'candidate@interviewera.com' }

    // Attacker attempts to forge victim's userId in body
    const sessionReq = new NextRequest('http://localhost/api/coach/session', {
      method: 'POST',
      body: JSON.stringify({
        durationMinutes: 3,
        userId: 'victim-999',
        email: 'victim@interviewera.com',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    const sessionRes = await sessionHandler(sessionReq)
    expect(sessionRes.status).toBe(200)

    // Session must be bound to attacker-1 in Redis, NOT victim-999
    expect(redisStore.get('coach:pending:victim-999')).toBeUndefined()
    expect(redisStore.get('coach:pending:attacker-1')).toBeDefined()
  })

  // ─── 5. Connect Hijack Prevention ───
  it('prevents a user from connecting or dispatching an agent to another user room', async () => {
    // Legitimate user A creates a room
    currentAuthUser = { id: 'user-a', email: 'candidate@interviewera.com' }
    const sessionReq = new NextRequest('http://localhost/api/coach/session', {
      method: 'POST',
      body: JSON.stringify({ durationMinutes: 3 }),
    })
    await sessionHandler(sessionReq)

    // User B attempts to connect to User A's room
    currentAuthUser = { id: 'user-b', email: 'candidate@interviewera.com' }
    const hijackReq = new NextRequest('http://localhost/api/coach/session/connect', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'vsdk_room_123' }),
    })
    const hijackRes = await connectHandler(hijackReq)
    expect(hijackRes.status).toBe(409) // No active session for user-b
    expect(mockDispatchAgent).not.toHaveBeenCalled()
  })

  // ─── 6. Automatic Quota Refund on Agent Dispatch Failure ───
  it('automatically refunds quota and force-ends room if agent dispatch fails', async () => {
    currentAuthUser = { id: 'cand-001', email: 'candidate@interviewera.com' }

    // Mint session
    const mintReq = new NextRequest('http://localhost/api/coach/session', {
      method: 'POST',
      body: JSON.stringify({ durationMinutes: 3 }),
    })
    await sessionHandler(mintReq)

    // Simulate agent dispatch failure (e.g. 502 upstream VideoSDK outage)
    mockDispatchAgent.mockResolvedValueOnce({
      ok: false,
      status: 502,
      error: 'Upstream agent service unavailable',
    })

    const connectReq = new NextRequest('http://localhost/api/coach/session/connect', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'vsdk_room_123' }),
    })
    const connectRes = await connectHandler(connectReq)
    expect(connectRes.status).toBe(502)
    const connectBody = await connectRes.json()

    // Quota was restored
    expect(connectBody.refunded).toBe(true)
    // Orphaned VideoSDK room was force-ended
    expect(mockForceEndRoom).toHaveBeenCalledTimes(1)
  })
})
