import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ATTRIBUTION_COOKIE_NAME } from '@/lib/analytics/attribution';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';

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

function request(body: Record<string, unknown>, cookie?: string): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-forwarded-for': '127.0.0.1',
  };
  if (cookie) headers.cookie = cookie;

  return new Request('http://localhost/api/analytics/cta-click', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/analytics/cta-click', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockResolvedValue({ allowed: true });
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('persists server cookie attribution with CTA fields', async () => {
    const response = await POST(
      request(
        {
          cta_key: CTA_KEYS.START_FREE_INTERVIEW,
          cta_text: 'Start free',
          page: '/',
          section: 'hero',
        },
        attributionCookie({ utm_source: 'creator', utm_campaign: 'launch' }),
      ),
    );

    expect(response.status).toBe(204);
    expect(trackProductEventServer).toHaveBeenCalledWith({
      event_name: 'landing_cta_clicked',
      user_id: 'user-1',
      cta_key: CTA_KEYS.START_FREE_INTERVIEW,
      cta_text: 'Start free',
      page: '/',
      section: 'hero',
      authenticated: true,
      source: 'client_cta',
      utm_source: 'creator',
      utm_campaign: 'launch',
    });
  });

  it('does not let client UTM override server cookie attribution', async () => {
    await POST(
      request(
        {
          cta_key: CTA_KEYS.START_FREE_INTERVIEW,
          cta_text: 'Start free',
          page: '/pricing',
          section: 'bottom',
          utm_source: 'client',
          utm_medium: 'paid',
        },
        attributionCookie({ utm_source: 'server' }),
      ),
    );

    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        utm_source: 'server',
        cta_key: CTA_KEYS.START_FREE_INTERVIEW,
        page: '/pricing',
      }),
    );
    expect(trackProductEventServer).not.toHaveBeenCalledWith(
      expect.objectContaining({ utm_medium: 'paid' }),
    );
  });

  it('remains safe with malformed cookie and preserves CTA payload', async () => {
    const response = await POST(
      request(
        {
          cta_key: CTA_KEYS.UPGRADE_CTA,
          cta_text: 'Upgrade',
          page: '/upgrade',
          section: 'grid',
        },
        `${ATTRIBUTION_COOKIE_NAME}=not-json`,
      ),
    );

    expect(response.status).toBe(204);
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'landing_cta_clicked',
        cta_key: CTA_KEYS.UPGRADE_CTA,
        page: '/upgrade',
        section: 'grid',
      }),
    );
    const payload = trackProductEventServer.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.utm_source).toBeUndefined();
  });
});
