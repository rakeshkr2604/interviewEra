import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  _resetSTTTokenCacheForTests,
  clearCachedSTTToken,
  fetchSTTTokenWithRetry,
  peekCachedSTTToken,
  putCachedSTTToken,
  takeCachedSTTToken,
  type STTTokenResponse,
} from './stt-token'

function token(overrides?: Partial<STTTokenResponse>): STTTokenResponse {
  return {
    token: 'tok',
    expires_in_seconds: 180,
    interview_id: 'i1',
    issued_at: new Date().toISOString(),
    session_lease_id: 'lease-1',
    ...overrides,
  }
}

afterEach(() => {
  _resetSTTTokenCacheForTests()
  vi.unstubAllGlobals()
})

describe('STT token client cache', () => {
  it('reuses a still-valid cached token instead of re-fetching', async () => {
    putCachedSTTToken('i1', token())
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const data = await fetchSTTTokenWithRetry('i1')
    expect(data.token).toBe('tok')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(peekCachedSTTToken('i1')).toBeNull()
  })

  it('prefetchOnly leaves the token for a later take', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify(token({ token: 'prefetched' })),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const first = await fetchSTTTokenWithRetry('i1', { prefetchOnly: true, maxAttempts: 1 })
    expect(first.token).toBe('prefetched')
    expect(peekCachedSTTToken('i1')?.token).toBe('prefetched')

    const second = await fetchSTTTokenWithRetry('i1', { maxAttempts: 1 })
    expect(second.token).toBe('prefetched')
    expect(peekCachedSTTToken('i1')).toBeNull()
  })

  it('takeCachedSTTToken rejects expired tokens', () => {
    putCachedSTTToken(
      'i1',
      token({
        issued_at: new Date(Date.now() - 200_000).toISOString(),
        expires_in_seconds: 180,
      }),
    )
    expect(takeCachedSTTToken('i1')).toBeNull()
  })

  it('clearCachedSTTToken drops the entry', () => {
    putCachedSTTToken('i1', token())
    clearCachedSTTToken('i1')
    expect(takeCachedSTTToken('i1')).toBeNull()
  })
})
