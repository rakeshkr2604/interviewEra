import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/supabase/ensure-public-user', () => ({
  ensurePublicUserRow: vi.fn(),
}));

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  buildRateLimitHttpResponse: vi.fn(),
}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}));

import { POST } from './route';

describe('POST /api/resume/upload auth gate', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSvc = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalSvc;
  });

  it('returns 401 for unauthenticated requests', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Auth session missing!' },
    });

    const response = await POST(
      new Request('http://localhost/api/resume/upload', { method: 'POST' }),
    );

    expect(response.status).toBe(401);
    expect(getUserMock).toHaveBeenCalledTimes(1);
  });

  it('passes auth gate for authenticated user (then fails at env guard)', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await POST(
      new Request('http://localhost/api/resume/upload', { method: 'POST' }),
    );

    expect(response.status).toBe(503);
    expect(getUserMock).toHaveBeenCalledTimes(1);
  });

  it('simulates login-to-immediate-upload race (unauth then auth)', async () => {
    getUserMock
      .mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Auth session missing!' },
      })
      .mockResolvedValueOnce({
        data: { user: { id: 'user-2' } },
        error: null,
      });
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const first = await POST(new Request('http://localhost/api/resume/upload', { method: 'POST' }));
    const second = await POST(new Request('http://localhost/api/resume/upload', { method: 'POST' }));

    expect(first.status).toBe(401);
    expect(second.status).toBe(503);
    expect(getUserMock).toHaveBeenCalledTimes(2);
  });
});

