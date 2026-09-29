import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('server-only', () => ({}))

const mockUpdateSession = vi.fn()
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: (req: NextRequest) => mockUpdateSession(req),
}))

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, resetInSeconds: 60 })),
}))

vi.mock('@/lib/auth/flags', () => ({
  isAuthV2Enabled: vi.fn(() => true),
}))

vi.mock('@/lib/auth/resolve-destination', () => ({
  extractInviteTokenFromNext: vi.fn(),
  resolvePostAuthDestination: vi.fn(async () => '/dashboard'),
}))

const validVerifiedUser = {
  id: 'usr_valid_123',
  email: 'user@example.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
}

describe('Middleware Auth Lifecycle & Cookie Propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('redirects unauthenticated user on /dashboard to /login and copies cleared cookies', async () => {
    // Simulate updateSession returning a response that cleared stale sb-* cookies
    const dummyResponse = NextResponse.next()
    dummyResponse.cookies.set('sb-proj-auth-token', '', { path: '/', maxAge: 0 })
    mockUpdateSession.mockResolvedValueOnce({
      response: dummyResponse,
      user: null,
    })

    const { proxy } = await import('../../proxy')
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: 'sb-proj-auth-token=dead-refresh-token',
      },
    })

    const response = await proxy(request)

    // Should redirect to /login?next=/dashboard
    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('/login')
    expect(location).toContain('next=%2Fdashboard')
    expect(location).toContain('reason=session_required')

    // CRITICAL: response cookies MUST contain the cleared cookie so the browser deletes it
    const clearedCookie = response.cookies.get('sb-proj-auth-token')
    expect(clearedCookie).toBeDefined()
    expect(clearedCookie?.value).toBe('')
    expect(clearedCookie?.maxAge).toBe(0)
  })

  it('allows valid authenticated user on /dashboard without redirect', async () => {
    const dummyResponse = NextResponse.next()
    dummyResponse.cookies.set('sb-proj-auth-token', 'valid-refreshed-token', { path: '/' })
    mockUpdateSession.mockResolvedValueOnce({
      response: dummyResponse,
      user: validVerifiedUser,
    })

    const { proxy } = await import('../../proxy')
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: 'sb-proj-auth-token=existing-valid-token',
      },
    })

    const response = await proxy(request)
    expect(response.status).toBe(200)
    // Refreshed cookie is preserved on response
    expect(response.cookies.get('sb-proj-auth-token')?.value).toBe('valid-refreshed-token')
  })

  it('redirects authenticated user on /login to /dashboard and preserves cookies', async () => {
    const dummyResponse = NextResponse.next()
    dummyResponse.cookies.set('sb-proj-auth-token', 'valid-token', { path: '/' })
    mockUpdateSession.mockResolvedValueOnce({
      response: dummyResponse,
      user: validVerifiedUser,
    })

    const { proxy } = await import('../../proxy')
    const request = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: 'sb-proj-auth-token=valid-token',
      },
    })

    const response = await proxy(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/dashboard')

    // Preserves session cookie on redirect
    expect(response.cookies.get('sb-proj-auth-token')?.value).toBe('valid-token')
  })

  it('triggers auth resolution and forwards cookie clear when API route receives dead sb-* cookie', async () => {
    const dummyResponse = NextResponse.next({
      request: {
        headers: new Headers({ 'x-ie-sb-cookies-stripped': '1' }),
      },
    })
    dummyResponse.cookies.set('sb-proj-auth-token', '', { path: '/', maxAge: 0 })
    mockUpdateSession.mockResolvedValueOnce({
      response: dummyResponse,
      user: null,
    })

    const { proxy } = await import('../../proxy')
    const request = new NextRequest('http://localhost:3000/api/coach/session', {
      method: 'POST',
      headers: {
        cookie: 'sb-proj-auth-token=stale-token',
      },
    })

    const response = await proxy(request)
    // API route is not redirected to /login by proxy; it receives the modified response
    expect(response.status).toBe(200)
    expect(mockUpdateSession).toHaveBeenCalled()
    // Stale cookies are marked for deletion
    const cleared = response.cookies.get('sb-proj-auth-token')
    expect(cleared?.maxAge).toBe(0)
  })

  it('redirects RSC/SPA request on protected route and carries cookie clear to prevent refresh loops', async () => {
    const dummyResponse = NextResponse.next()
    dummyResponse.cookies.set('sb-proj-auth-token', '', { path: '/', maxAge: 0 })
    mockUpdateSession.mockResolvedValueOnce({
      response: dummyResponse,
      user: null,
    })

    const { proxy } = await import('../../proxy')
    // Next.js App Router RSC client navigation
    const request = new NextRequest('http://localhost:3000/dashboard?_rsc=123', {
      headers: {
        RSC: '1',
        cookie: 'sb-proj-auth-token=stale-token',
      },
    })

    const response = await proxy(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')

    // Verifies cookies are cleared on the RSC redirect response
    const cleared = response.cookies.get('sb-proj-auth-token')
    expect(cleared?.maxAge).toBe(0)
    expect(cleared?.value).toBe('')
  })

  it('does not hijack /auth/error?code= catalogue params as OAuth codes', async () => {
    const { proxy } = await import('../../proxy')
    const request = new NextRequest(
      'http://localhost:3000/auth/error?code=invalid_credentials',
    )

    const response = await proxy(request)

    // Public recovery hub must render — never redirect to /auth/callback.
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(mockUpdateSession).not.toHaveBeenCalled()
  })

  it('still forwards stray OAuth ?code= on non-auth-error routes to /auth/callback', async () => {
    const { proxy } = await import('../../proxy')
    const request = new NextRequest(
      'http://localhost:3000/?code=oauth-pkce-example-code&next=%2Fdashboard',
    )

    const response = await proxy(request)

    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('/auth/callback')
    expect(location).toContain('code=oauth-pkce-example-code')
    expect(location).toContain('next=%2Fdashboard')
  })

  it('does not bypass auth for crawlers requesting protected routes', async () => {
    const dummyResponse = NextResponse.next()
    dummyResponse.cookies.set('sb-proj-auth-token', '', { path: '/', maxAge: 0 })
    mockUpdateSession.mockResolvedValueOnce({
      response: dummyResponse,
      user: null,
    })

    const { proxy } = await import('../../proxy')
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        cookie: 'sb-proj-auth-token=dead-token',
      },
    })

    const response = await proxy(request)
    // Protected route must NOT let crawler through without auth
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })
})
