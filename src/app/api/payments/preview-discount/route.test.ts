import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const quoteCampaignDiscount = vi.fn();
const trackProductEventServer = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
  }),
  createServiceClient: () => ({ service: true }),
}));

vi.mock('@/lib/campaign-codes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/campaign-codes')>();
  return {
    ...actual,
    quoteCampaignDiscount: (...args: unknown[]) => quoteCampaignDiscount(...args),
  };
});

vi.mock('@/lib/analytics/product-events-server', () => ({
  trackProductEventServer: (...args: unknown[]) => trackProductEventServer(...args),
}));

import { POST } from './route';

function request(body: unknown): Request {
  return new Request('http://localhost/api/payments/preview-discount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/payments/preview-discount analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: 'server-user' } },
      error: null,
    });
  });

  it('emits coupon_applied only after an active server quote succeeds', async () => {
    quoteCampaignDiscount.mockResolvedValue({
      ok: true,
      error_code: null,
      campaign_code_id: 'campaign-1',
      discount_paise: 9000,
      final_amount_paise: 20900,
      label: 'Launch',
      kind: 'promo',
      discount_type: 'percent',
      discount_value: 30,
      starts_at: null,
      expires_at: '2026-08-17T00:00:00.000Z',
      is_active: true,
      server_now: '2026-08-16T12:00:00.000Z',
    });

    const response = await POST(
      request({
        plan: 'starter',
        code: 'launch30',
        coupon_attempt_id: '7ebd58a6-85e2-4f7f-859e-8f271019c862',
      }),
    );

    expect(response.status).toBe(200);
    expect(trackProductEventServer).toHaveBeenCalledWith({
      event_name: 'coupon_applied',
      user_id: 'server-user',
      plan: 'starter',
      campaign_code: 'LAUNCH30',
      campaign_code_id: 'campaign-1',
      discount_paise: 9000,
      final_amount_paise: 20900,
      coupon_attempt_id: '7ebd58a6-85e2-4f7f-859e-8f271019c862',
      source: 'preview_discount',
    });
  });

  it('does not emit coupon_applied when server validation rejects the code', async () => {
    quoteCampaignDiscount.mockResolvedValue({
      ok: false,
      error_code: 'CODE_INVALID',
      campaign_code_id: null,
      discount_paise: 0,
      final_amount_paise: 29900,
      is_active: false,
    });

    const response = await POST(request({ plan: 'starter', code: 'INVALID' }));

    expect(response.status).toBe(400);
    expect(trackProductEventServer).not.toHaveBeenCalled();
  });
});
