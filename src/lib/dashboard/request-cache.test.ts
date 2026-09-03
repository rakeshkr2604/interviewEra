import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

describe('request-cache getCachedAuthUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns valid user when authenticated', async () => {
    const validUser = { id: 'usr_123', email: 'test@example.com' }
    mockGetUser.mockResolvedValueOnce({
      data: { user: validUser },
      error: null,
    })

    const { getCachedAuthUser } = await import('./request-cache')
    const user = await getCachedAuthUser()
    expect(user).toEqual(validUser)
  })

  it('returns null for missing session (AuthSessionMissingError)', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' },
    })

    const { getCachedAuthUser } = await import('./request-cache')
    const user = await getCachedAuthUser()
    expect(user).toBeNull()
  })

  it('returns null for stale session errors (refresh_token_not_found, already_used, invalid_grant)', async () => {
    const staleErrors = [
      { code: 'refresh_token_not_found', message: 'Invalid Refresh Token: Refresh Token Not Found' },
      { code: 'refresh_token_already_used', message: 'Already used' },
      { code: 'invalid_grant', message: 'Invalid grant' },
      { code: 'session_expired', message: 'Session expired' },
      { name: 'AuthApiError', message: 'invalid refresh token' },
    ]

    for (const error of staleErrors) {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error,
      })
      const { getCachedAuthUser } = await import('./request-cache')
      const user = await getCachedAuthUser()
      expect(user).toBeNull()
    }
  })

  it('throws when encountering Supabase 5xx infrastructure failure', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { status: 503, message: 'Supabase Service Unavailable' },
    })

    const { getCachedAuthUser } = await import('./request-cache')
    await expect(getCachedAuthUser()).rejects.toMatchObject({
      status: 503,
      message: 'Supabase Service Unavailable',
    })
  })

  it('throws when encountering AuthRetryableFetchError or network outage', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
    })

    const { getCachedAuthUser } = await import('./request-cache')
    await expect(getCachedAuthUser()).rejects.toMatchObject({
      name: 'AuthRetryableFetchError',
    })
  })
})
