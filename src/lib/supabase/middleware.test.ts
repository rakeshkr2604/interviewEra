import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

describe('updateSession auth refresh path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.IE_DIAGNOSTICS_AUTH_TRACE;
  });

  it('handles unauthenticated refresh failures without throwing', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'invalid_refresh_token', message: 'refresh token not found' },
    });

    const { updateSession } = await import('@/lib/supabase/middleware');
    const request = new NextRequest('http://localhost/dashboard', {
      headers: { cookie: 'sb-proj-auth-token=abc; other=1' },
    });

    const result = await updateSession(request);
    expect(result.user).toBeNull();
    expect(result.response.status).toBe(200);
  });

  it('emits trace logs only when auth diagnostics are enabled', async () => {
    process.env.IE_DIAGNOSTICS_AUTH_TRACE = '1';
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'invalid_refresh_token', message: 'refresh token not found' },
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { updateSession } = await import('@/lib/supabase/middleware');
    const request = new NextRequest('http://localhost/dashboard', {
      headers: { cookie: 'sb-proj-auth-token=abc; other=1', 'x-ie-correlation-id': 'corr-1' },
    });
    await updateSession(request);

    expect(warnSpy).toHaveBeenCalledWith(
      '[auth-trace][update-session]',
      expect.stringContaining('"correlation_id":"corr-1"'),
    );
  });

  it('marks sb-* cookies with maxAge 0 when refresh_token_not_found occurs', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'refresh_token_not_found', message: 'Invalid Refresh Token: Refresh Token Not Found' },
    });

    const { updateSession } = await import('@/lib/supabase/middleware');
    const request = new NextRequest('http://localhost/dashboard', {
      headers: { cookie: 'sb-proj-auth-token=dead-token; other-cookie=val' },
    });

    const result = await updateSession(request);
    expect(result.user).toBeNull();

    // Check that sb-proj-auth-token has been cleared with maxAge: 0
    const cleared = result.response.cookies.get('sb-proj-auth-token');
    expect(cleared).toBeDefined();
    expect(cleared?.value).toBe('');
    expect(cleared?.maxAge).toBe(0);
  });

  it('returns valid user without clearing cookies when session is valid', async () => {
    const mockUser = { id: 'usr_valid', email: 'valid@example.com' };
    getUserMock.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const { updateSession } = await import('@/lib/supabase/middleware');
    const request = new NextRequest('http://localhost/dashboard', {
      headers: { cookie: 'sb-proj-auth-token=live-token' },
    });

    const result = await updateSession(request);
    expect(result.user).toEqual(mockUser);
    expect(result.response.status).toBe(200);
    // Should NOT clear the cookie
    const cleared = result.response.cookies.get('sb-proj-auth-token');
    expect(cleared).toBeUndefined();
  });

  it('treats a hung Supabase auth call as unauthenticated instead of hanging the request', async () => {
    // Regression: getUser() had no timeout, so a slow/unresponsive Supabase
    // auth endpoint hung every request through proxy.ts (including /login,
    // which is itself an AUTH_ROUTE) up to the platform's own function
    // timeout. See AUTH_CHECK_TIMEOUT_MS in middleware.ts.
    vi.useFakeTimers();
    try {
      getUserMock.mockImplementationOnce(() => new Promise(() => {})) // never resolves
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { updateSession } = await import('@/lib/supabase/middleware');
      const request = new NextRequest('http://localhost/login', {
        headers: { cookie: 'sb-proj-auth-token=maybe-still-valid' },
      });

      const resultPromise = updateSession(request);
      await vi.advanceTimersByTimeAsync(5000);
      const result = await resultPromise;

      expect(result.user).toBeNull();
      expect(result.response.status).toBe(200);
      // A timeout is not evidence the session is invalid — must not wipe a
      // cookie that might still be good once Supabase recovers.
      const cleared = result.response.cookies.get('sb-proj-auth-token');
      expect(cleared).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('auth check timed out after 5000ms'),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

