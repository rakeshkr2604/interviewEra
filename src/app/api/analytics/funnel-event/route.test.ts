import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ATTRIBUTION_COOKIE_NAME } from '@/lib/analytics/attribution';

const getUser = vi.fn();
const checkRateLimit = vi.fn();
const trackProductEventServer = vi.fn();
const paymentMaybeSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
  }),
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: paymentMaybeSingle }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

vi.mock('@/lib/analytics/product-events-server', () => ({
  trackProductEventServer: (...args: unknown[]) => trackProductEventServer(...args),
}));

import { POST } from './route';

function request(body: Record<string, unknown>, cookie?: string): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-forwarded-for': '127.0.0.1',
  };
  if (cookie) headers.cookie = cookie;

  return new Request('http://localhost/api/analytics/funnel-event', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function attributionCookie(values: Record<string, string>): string {
  return `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(values))}`;
}

describe('POST /api/analytics/funnel-event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockResolvedValue({ allowed: true });
    paymentMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('uses authenticated server identity instead of a client-provided user ID', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'server-user' } },
      error: null,
    });

    const response = await POST(
      request({
        event_name: 'pricing_page_viewed',
        user_id: 'spoofed-user',
        userId: 'also-spoofed',
        source_page: '/pricing',
      }),
    );

    expect(response.status).toBe(204);
    expect(trackProductEventServer).toHaveBeenCalledWith({
      event_name: 'pricing_page_viewed',
      source_page: '/pricing',
      user_id: 'server-user',
    });
  });

  it('keeps anonymous events anonymous when a client supplies a user ID', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await POST(
      request({
        event_name: 'pricing_page_viewed',
        user_id: 'spoofed-user',
        anonymous_id: 'anon-1',
      }),
    );

    expect(trackProductEventServer).toHaveBeenCalledWith({
      event_name: 'pricing_page_viewed',
    });
  });

  it('uses server order metadata and ignores client price for payment_started', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'server-user' } },
      error: null,
    });
    paymentMaybeSingle.mockResolvedValue({
      data: {
        plan: 'pro',
        amount: 39900,
        campaign_code_id: 'campaign-1',
      },
      error: null,
    });

    await POST(
      request({
        event_name: 'payment_started',
        order_id: 'order-1',
        plan: 'starter',
        amount: 1,
        final_amount_paise: 1,
        source: 'upgrade',
      }),
    );

    expect(trackProductEventServer).toHaveBeenCalledWith({
      event_name: 'payment_started',
      order_id: 'order-1',
      source: 'upgrade',
      plan: 'pro',
      amount: 39900,
      campaign_code_id: 'campaign-1',
      user_id: 'server-user',
    });
  });

  it('rejects client-authored payment completion events', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'server-user' } },
      error: null,
    });

    await POST(
      request({
        event_name: 'payment_completed',
        payment_id: 'pay-forged',
      }),
    );

    expect(trackProductEventServer).not.toHaveBeenCalled();
  });

  it('persists server cookie attribution on durable funnel events', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'server-user' } },
      error: null,
    });

    await POST(
      request(
        {
          event_name: 'pricing_page_viewed',
          source_page: '/pricing',
          utm_source: 'client',
        },
        attributionCookie({ utm_source: 'server', utm_medium: 'social' }),
      ),
    );

    expect(trackProductEventServer).toHaveBeenCalledWith({
      event_name: 'pricing_page_viewed',
      source_page: '/pricing',
      utm_source: 'server',
      utm_medium: 'social',
      user_id: 'server-user',
    });
  });

  it('uses client attribution fallback when cookie is absent', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await POST(
      request({
        event_name: 'plan_selected',
        plan: 'starter',
        source: 'pricing_grid',
        utm_source: 'client-fallback',
      }),
    );

    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'plan_selected',
        utm_source: 'client-fallback',
      }),
    );
  });

  it('ignores malformed cookie and still persists the event', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(
      request(
        {
          event_name: 'pricing_page_viewed',
          source_page: '/pricing',
        },
        `${ATTRIBUTION_COOKIE_NAME}=not-json`,
      ),
    );

    expect(response.status).toBe(204);
    expect(trackProductEventServer).toHaveBeenCalledWith({
      event_name: 'pricing_page_viewed',
      source_page: '/pricing',
    });
  });
});
