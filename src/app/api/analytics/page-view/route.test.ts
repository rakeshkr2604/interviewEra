import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ATTRIBUTION_COOKIE_NAME } from '@/lib/analytics/attribution';

const getUser = vi.fn();
const checkRateLimit = vi.fn();
const trackProductEventServer = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
  }),
}));

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

vi.mock('@/lib/analytics/product-events-server', () => ({
  trackProductEventServer: (...args: unknown[]) => trackProductEventServer(...args),
}));

import { POST } from './route';

function attributionCookie(values: Record<string, string>): string {
  return `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(values))}`;
}

function request(
  body: Record<string, unknown>,
  cookie?: string,
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-forwarded-for': '127.0.0.1',
  };
  if (cookie) headers.cookie = cookie;

  return new Request('http://localhost/api/analytics/page-view', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/analytics/page-view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockResolvedValue({ allowed: true });
    getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('persists server cookie attribution on durable page_view', async () => {
    const response = await POST(
      request({ path: '/pricing' }, attributionCookie({ utm_source: 'creator' })),
    );

    expect(response.status).toBe(204);
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'page_view',
        page_path: '/pricing',
        utm_source: 'creator',
      }),
    );
  });

  it('prefers server cookie over conflicting client UTM fallback', async () => {
    await POST(
      request(
        { path: '/', utm_source: 'client', utm_medium: 'social' },
        attributionCookie({ utm_source: 'server' }),
      ),
    );

    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        utm_source: 'server',
      }),
    );
    expect(trackProductEventServer).not.toHaveBeenCalledWith(
      expect.objectContaining({ utm_medium: 'social' }),
    );
  });

  it('uses client attribution fallback when cookie is absent', async () => {
    await POST(request({ path: '/pricing', utm_source: 'client-fallback' }));

    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        page_path: '/pricing',
        utm_source: 'client-fallback',
      }),
    );
  });

  it('succeeds without attribution when cookie is malformed', async () => {
    const response = await POST(
      request({ path: '/about' }, `${ATTRIBUTION_COOKIE_NAME}=not-json`),
    );

    expect(response.status).toBe(204);
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'page_view',
        page_path: '/about',
      }),
    );
    const payload = trackProductEventServer.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.utm_source).toBeUndefined();
  });

  it('attributes a fresh UTM landing from beacon body when no cookie exists yet', async () => {
    const response = await POST(
      request({
        path: '/some-page?utm_source=x&utm_medium=y&utm_campaign=z',
        utm_source: 'x',
        utm_medium: 'y',
        utm_campaign: 'z',
      }),
    );

    expect(response.status).toBe(204);
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'page_view',
        utm_source: 'x',
        utm_medium: 'y',
        utm_campaign: 'z',
      }),
    );
  });
});
