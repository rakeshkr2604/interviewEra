import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import {
  DeepgramCircuitBreaker,
  computeBackoffMs,
} from '@/lib/voice/deepgram-circuit-breaker'
import {
  STTTokenError,
  fetchSTTTokenWithMeta,
  fetchSTTTokenWithRetry,
  releaseSTTSession,
  is429Error,
  tokenErrorMessage,
} from '@/lib/voice/stt-token'
import { buildDeepgramTelemetryPayload } from '@/lib/voice/deepgram-telemetry'
import { VoiceHealthMonitor } from '@/lib/voice/deepgram-health'
import { shouldRetryTokenAfter429 } from '@/lib/quota/stt-session-accounting'

describe('DeepgramCircuitBreaker', () => {
  it('opens after repeated failures', () => {
    const breaker = new DeepgramCircuitBreaker({ failureThreshold: 3, cooldownMs: 5000, minTokenIntervalMs: 100 })
    breaker.recordFailure('429')
    breaker.recordFailure('429')
    expect(breaker.getState().isOpen).toBe(false)
    breaker.recordFailure('429')
    expect(breaker.getState().isOpen).toBe(true)
  })

  it('throttles rapid token requests', () => {
    const breaker = new DeepgramCircuitBreaker({ failureThreshold: 5, cooldownMs: 60000, minTokenIntervalMs: 2000 })
    breaker.recordTokenRequest(1000)
    const gate = breaker.canRequestToken(1500)
    expect(gate.allowed).toBe(false)
    expect(gate.reason).toBe('token_throttled')
  })

  it('resets on success', () => {
    const breaker = new DeepgramCircuitBreaker()
    breaker.recordFailure('err')
    breaker.recordSuccess()
    expect(breaker.getState().failureCount).toBe(0)
  })

  it('recovers after cooldown expires', () => {
    const breaker = new DeepgramCircuitBreaker({ failureThreshold: 1, cooldownMs: 100, minTokenIntervalMs: 0 })
    breaker.recordFailure('err', 1000)
    expect(breaker.canRequestToken(1000).allowed).toBe(false)
    expect(breaker.canRequestToken(1200).allowed).toBe(true)
  })

  it('reset clears all state', () => {
    const breaker = new DeepgramCircuitBreaker()
    breaker.recordFailure('x')
    breaker.recordTokenRequest()
    breaker.reset()
    const s = breaker.getState()
    expect(s.failureCount).toBe(0)
    expect(s.tokenRequestCount).toBe(0)
    expect(s.isOpen).toBe(false)
  })
})

describe('computeBackoffMs', () => {
  it('grows exponentially with jitter cap', () => {
    expect(computeBackoffMs(0)).toBeGreaterThanOrEqual(1000)
    expect(computeBackoffMs(4)).toBeLessThanOrEqual(16400)
  })

  it('increases with attempt index', () => {
    const a0 = computeBackoffMs(0, 1000, 16000)
    const a2 = computeBackoffMs(2, 1000, 16000)
    expect(a2).toBeGreaterThanOrEqual(a0)
  })
})

describe('STTTokenError', () => {
  it('marks 429 as rate limit', () => {
    const err = new STTTokenError('busy', 429)
    expect(err.isRateLimit).toBe(true)
  })

  it('preserves text_mode fallback', () => {
    const err = new STTTokenError('quota', 429, { fallback: 'text_mode' })
    expect(err.fallback).toBe('text_mode')
  })
})

describe('fetchSTTTokenWithRetry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retries on 429 then succeeds', async () => {
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        return new Response(JSON.stringify({ error: 'rate limited' }), {
          status: 429,
          headers: { 'Retry-After': '1' },
        })
      }
      return new Response(
        JSON.stringify({
          token: 'tok',
          expires_in_seconds: 120,
          interview_id: 'i1',
          issued_at: new Date().toISOString(),
          session_lease_id: 'lease-1',
        }),
        { status: 200 },
      )
    }))

    const data = await fetchSTTTokenWithRetry('i1', { maxAttempts: 3 })
    expect(data.token).toBe('tok')
    expect(data.session_lease_id).toBe('lease-1')
    expect(calls).toBe(2)
  })

  it('does not retry on quota text_mode fallback', async () => {
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        return new Response(
          JSON.stringify({ error: 'quota', fallback: 'text_mode' }),
          { status: 429 },
        )
      }),
    )

    await expect(fetchSTTTokenWithRetry('i1', { maxAttempts: 4 })).rejects.toMatchObject({
      fallback: 'text_mode',
    })
    expect(calls).toBe(1)
  })

  it('passes refresh_lease_id on refresh token fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { refresh_lease_id?: string }
        expect(body.refresh_lease_id).toBe('lease-refresh')
        return new Response(
          JSON.stringify({
            token: 'tok2',
            expires_in_seconds: 120,
            interview_id: 'i1',
            issued_at: new Date().toISOString(),
            session_lease_id: 'lease-refresh',
          }),
          { status: 200 },
        )
      }),
    )

    const data = await fetchSTTTokenWithMeta('i1', { refreshLeaseId: 'lease-refresh' })
    expect(data.token).toBe('tok2')
  })

  it('throws on 503 voice unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'not configured' }), { status: 503 }),
      ),
    )
    await expect(fetchSTTTokenWithMeta('i1')).rejects.toMatchObject({ status: 503 })
  })

  it('throws on 401 unauthorized', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    await expect(fetchSTTTokenWithMeta('i1')).rejects.toMatchObject({ status: 401 })
  })

  it('throws on 403 inactive interview', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })))
    await expect(fetchSTTTokenWithMeta('i1')).rejects.toMatchObject({ status: 403 })
  })

  it('throws on 409 expired lease', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 409 })))
    await expect(
      fetchSTTTokenWithMeta('i1', { refreshLeaseId: 'stale' }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('retries on 502 upstream failure', async () => {
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        return new Response(JSON.stringify({ error: 'bad gateway' }), { status: 502 })
      }
      return new Response(
        JSON.stringify({
          token: 'ok',
          expires_in_seconds: 120,
          interview_id: 'i1',
          issued_at: new Date().toISOString(),
        }),
        { status: 200 },
      )
    }))

    const data = await fetchSTTTokenWithRetry('i1', { maxAttempts: 2 })
    expect(data.token).toBe('ok')
    expect(calls).toBe(2)
  })
})

describe('releaseSTTSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts release payload with keepalive fetch', () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    releaseSTTSession('i1', 'lease-9', 45)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/stt/release',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
      }),
    )
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      interview_id: string
      session_lease_id: string
      duration_seconds: number
    }
    expect(body.interview_id).toBe('i1')
    expect(body.session_lease_id).toBe('lease-9')
    expect(body.duration_seconds).toBe(45)
  })

  it('uses sendBeacon when beacon option set', () => {
    const beacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: beacon })

    releaseSTTSession('i1', 'lease-b', 10, { beacon: true })
    expect(beacon).toHaveBeenCalledWith(
      '/api/stt/release',
      expect.any(Blob),
    )
  })
})

describe('token helpers', () => {
  it('is429Error detects rate limit errors', () => {
    expect(is429Error(new STTTokenError('x', 429))).toBe(true)
    expect(is429Error(new Error('x'))).toBe(false)
  })

  it('tokenErrorMessage surfaces text_mode message', () => {
    const msg = tokenErrorMessage(
      new STTTokenError('Monthly quota exceeded', 429, { fallback: 'text_mode' }),
    )
    expect(msg).toContain('quota')
  })

  it('shouldRetryTokenAfter429 aligns with client policy', () => {
    expect(shouldRetryTokenAfter429('text_mode')).toBe(false)
    expect(shouldRetryTokenAfter429(undefined)).toBe(true)
  })
})

describe('buildDeepgramTelemetryPayload', () => {
  it('includes session and platform metadata', () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('Intl', {
      DateTimeFormat: () => ({
        resolvedOptions: () => ({ timeZone: 'Asia/Kolkata', locale: 'en-IN' }),
      }),
    })
    const payload = buildDeepgramTelemetryPayload(
      { interviewId: 'abc', questionIndex: 0, phase: 'candidate_answering' },
      { event: 'deepgram_token_success' },
    )
    expect(payload.interview_id).toBe('abc')
    expect(payload.timezone).toBe('Asia/Kolkata')
    expect(payload.country).toBe('IN')
  })
})

describe('VoiceHealthMonitor', () => {
  it('tracks reconnect count and session duration', () => {
    const monitor = new VoiceHealthMonitor()
    monitor.markSessionStarted()
    monitor.incrementReconnect()
    monitor.setConnectionState('retrying', 'Retrying…')
    const snap = monitor.snapshot({
      failureCount: 1,
      isOpen: false,
      cooldownUntilMs: null,
      lastFailureAt: Date.now(),
      lastError: '429',
      tokenRequestCount: 2,
      lastTokenRequestAt: Date.now(),
    })
    expect(snap.reconnect_count).toBe(1)
    expect(snap.connection_state).toBe('retrying')
    expect(snap.session_duration_ms).not.toBeNull()
  })

  it('records token refresh count', () => {
    const monitor = new VoiceHealthMonitor()
    monitor.incrementRefresh()
    monitor.incrementRefresh()
    const snap = monitor.snapshot({
      failureCount: 0,
      isOpen: false,
      cooldownUntilMs: null,
      lastFailureAt: null,
      lastError: null,
      tokenRequestCount: 0,
      lastTokenRequestAt: null,
    })
    expect(snap.refresh_count).toBe(2)
  })

  it('stores token expiry ISO string', () => {
    const monitor = new VoiceHealthMonitor()
    monitor.setTokenExpiry('2030-01-01T00:00:00.000Z')
    const snap = monitor.snapshot({
      failureCount: 0,
      isOpen: false,
      cooldownUntilMs: null,
      lastFailureAt: null,
      lastError: null,
      tokenRequestCount: 0,
      lastTokenRequestAt: null,
    })
    expect(snap.token_expiry).toBe('2030-01-01T00:00:00.000Z')
  })
})

describe('DeepgramSessionController (integration mocks)', () => {
  const tokenResponse = (leaseId: string, refreshLeaseId?: string) =>
    JSON.stringify({
      token: 'tok',
      expires_in_seconds: 120,
      interview_id: 'i1',
      issued_at: new Date().toISOString(),
      session_lease_id: refreshLeaseId ?? leaseId,
    })

  function stubFetch(leaseId = 'lease-new') {
    let releaseCalls = 0
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/stt/release') {
        releaseCalls += 1
        return new Response('{}', { status: 200 })
      }
      const body = JSON.parse(String(init?.body ?? '{}')) as { refresh_lease_id?: string }
      return new Response(tokenResponse(leaseId, body.refresh_lease_id), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    return { fetchMock, getReleaseCalls: () => releaseCalls }
  }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.doUnmock('@/lib/voice/stt-client')
  })

  it('refresh path passes lease id without releasing quota on teardown', async () => {
    const { getReleaseCalls } = stubFetch('lease-x')
    const { DeepgramSessionController } = await import('@/lib/voice/deepgram-session-controller')

    const controller = new DeepgramSessionController(
      'i1',
      { interviewId: 'i1', questionIndex: 0, phase: 'candidate_answering' },
      () => {},
      {
        onPartial: () => {},
        onFinal: () => {},
        onWsOpen: () => {},
        onRefreshRestart: () => {},
        onUiState: () => {},
        onFatalError: () => {},
        isMounted: () => true,
        startMic: async () => () => {},
        stopMic: () => {},
        releaseAudio: async () => {},
      },
    )

    controller.stop({ releaseQuota: false })
    expect(getReleaseCalls()).toBe(0)

    ;(controller as unknown as { sessionLeaseId: string }).sessionLeaseId = 'lease-x'
    controller.stop({ releaseQuota: true })
    expect(getReleaseCalls()).toBe(1)
  })

  it('releases lease when unmounted during token fetch', async () => {
    const { getReleaseCalls } = stubFetch('lease-unmount-token')
    let mounted = true
    let resolveToken!: () => void
    const tokenGate = new Promise<void>((r) => {
      resolveToken = r
    })

    vi.doMock('@/lib/voice/stt-token', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/voice/stt-token')>()
      return {
        ...actual,
        fetchSTTTokenWithRetry: vi.fn(async () => {
          await tokenGate
          return {
            token: 'tok',
            expires_in_seconds: 120,
            interview_id: 'i1',
            issued_at: new Date().toISOString(),
            session_lease_id: 'lease-unmount-token',
          }
        }),
      }
    })

    const { DeepgramSessionController } = await import('@/lib/voice/deepgram-session-controller')
    const controller = new DeepgramSessionController(
      'i1',
      { interviewId: 'i1', questionIndex: 0, phase: 'candidate_answering' },
      () => {},
      {
        onPartial: () => {},
        onFinal: () => {},
        onWsOpen: () => {},
        onRefreshRestart: () => {},
        onUiState: () => {},
        onFatalError: () => {},
        isMounted: () => mounted,
        startMic: async () => () => {},
        stopMic: () => {},
        releaseAudio: async () => {},
      },
    )

    const startPromise = controller.start()
    mounted = false
    resolveToken()
    await startPromise

    expect(getReleaseCalls()).toBe(1)
    expect(controller.getSessionLeaseId()).toBeNull()
  })

  it('releases lease when unmounted during connect retry backoff', async () => {
    const { getReleaseCalls } = stubFetch('lease-unmount-connect')
    let mounted = true

    vi.doMock('@/lib/voice/stt-client', () => ({
      StreamingSTT: class {
        startAttempts = 0
        async start() {
          this.startAttempts += 1
          if (this.startAttempts === 1) {
            throw new Error('ws failed')
          }
          await new Promise((r) => setTimeout(r, 500))
        }
        stop() {}
        sendAudio() {}
      },
    }))

    vi.doMock('@/lib/voice/deepgram-circuit-breaker', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/voice/deepgram-circuit-breaker')>()
      return {
        ...actual,
        computeBackoffMs: () => 50,
        sleepMs: (ms: number) =>
          new Promise<void>((r) => {
            setTimeout(() => {
              mounted = false
              r()
            }, ms)
          }),
      }
    })

    const { DeepgramSessionController } = await import('@/lib/voice/deepgram-session-controller')
    const controller = new DeepgramSessionController(
      'i1',
      { interviewId: 'i1', questionIndex: 0, phase: 'candidate_answering' },
      () => {},
      {
        onPartial: () => {},
        onFinal: () => {},
        onWsOpen: () => {},
        onRefreshRestart: () => {},
        onUiState: () => {},
        onFatalError: () => {},
        isMounted: () => mounted,
        startMic: async () => () => {},
        stopMic: () => {},
        releaseAudio: async () => {},
      },
    )

    await controller.start()

    expect(getReleaseCalls()).toBe(1)
    expect(controller.getSessionLeaseId()).toBeNull()
  })

  it('releases lease when unmounted during refresh token fetch', async () => {
    const { getReleaseCalls } = stubFetch('lease-refresh')
    let mounted = true
    let resolveRefresh!: () => void
    const refreshGate = new Promise<void>((r) => {
      resolveRefresh = r
    })

    vi.doMock('@/lib/voice/stt-token', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/voice/stt-token')>()
      return {
        ...actual,
        fetchSTTTokenWithRetry: vi.fn(async (_id: string, opts?: { refreshLeaseId?: string }) => {
          if (opts?.refreshLeaseId) {
            await refreshGate
          }
          return {
            token: 'tok',
            expires_in_seconds: 120,
            interview_id: 'i1',
            issued_at: new Date().toISOString(),
            session_lease_id: opts?.refreshLeaseId ?? 'lease-refresh',
          }
        }),
      }
    })

    vi.doMock('@/lib/voice/stt-client', () => ({
      StreamingSTT: class {
        async start() {}
        stop() {}
        sendAudio() {}
      },
    }))

    const { DeepgramSessionController } = await import('@/lib/voice/deepgram-session-controller')
    const controller = new DeepgramSessionController(
      'i1',
      { interviewId: 'i1', questionIndex: 0, phase: 'candidate_answering' },
      () => {},
      {
        onPartial: () => {},
        onFinal: () => {},
        onWsOpen: () => {},
        onRefreshRestart: () => {},
        onUiState: () => {},
        onFatalError: () => {},
        isMounted: () => mounted,
        startMic: async () => () => {},
        stopMic: () => {},
        releaseAudio: async () => {},
      },
    )

    ;(controller as unknown as { sessionLeaseId: string }).sessionLeaseId = 'lease-refresh'

    const refreshPromise = controller.start({ isRefresh: true })
    mounted = false
    resolveRefresh()
    await refreshPromise

    expect(getReleaseCalls()).toBe(1)
    expect(controller.getSessionLeaseId()).toBeNull()
  })

  it('stop releases lease at most once on repeated stop calls', async () => {
    const { getReleaseCalls } = stubFetch('lease-once')
    const { DeepgramSessionController } = await import('@/lib/voice/deepgram-session-controller')

    const controller = new DeepgramSessionController(
      'i1',
      { interviewId: 'i1', questionIndex: 0, phase: 'candidate_answering' },
      () => {},
      {
        onPartial: () => {},
        onFinal: () => {},
        onWsOpen: () => {},
        onRefreshRestart: () => {},
        onUiState: () => {},
        onFatalError: () => {},
        isMounted: () => true,
        startMic: async () => () => {},
        stopMic: () => {},
        releaseAudio: async () => {},
      },
    )

    ;(controller as unknown as { sessionLeaseId: string }).sessionLeaseId = 'lease-once'
    controller.stop({ releaseQuota: true })
    controller.stop({ releaseQuota: true })
    controller.stop({ releaseQuota: true })

    expect(getReleaseCalls()).toBe(1)
    expect(controller.getSessionLeaseId()).toBeNull()
  })

  it('refresh teardown does not release lease before reconnect', async () => {
    const { getReleaseCalls } = stubFetch('lease-refresh-intact')
    const { DeepgramSessionController } = await import('@/lib/voice/deepgram-session-controller')

    const controller = new DeepgramSessionController(
      'i1',
      { interviewId: 'i1', questionIndex: 0, phase: 'candidate_answering' },
      () => {},
      {
        onPartial: () => {},
        onFinal: () => {},
        onWsOpen: () => {},
        onRefreshRestart: () => {},
        onUiState: () => {},
        onFatalError: () => {},
        isMounted: () => true,
        startMic: async () => () => {},
        stopMic: () => {},
        releaseAudio: async () => {},
      },
    )

    ;(controller as unknown as { sessionLeaseId: string }).sessionLeaseId = 'lease-refresh-intact'
    controller.stop({ releaseQuota: false })

    expect(getReleaseCalls()).toBe(0)
    expect(controller.getSessionLeaseId()).toBe('lease-refresh-intact')
  })
})
