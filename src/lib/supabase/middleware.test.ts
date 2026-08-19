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
});

