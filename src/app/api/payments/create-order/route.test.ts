import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGetUser = vi.fn();
const profileMaybeSingle = vi.fn();
const reserveCampaignCode = vi.fn();
const attachCampaignOrder = vi.fn();
const releaseCampaignReservation = vi.fn();
const createPlanOrder = vi.fn();
const paymentInsert = vi.fn();
const existingPaymentMaybeSingle = vi.fn();
const trackProductEventServer = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: authGetUser },
    from: (table: string) => {
      if (table !== 'users') throw new Error(`Unexpected client table: ${table}`);
      return {
        select: () => ({
          eq: () => ({ maybeSingle: profileMaybeSingle }),
        }),
      };
    },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'payments') {
        return {
          insert: paymentInsert,
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: existingPaymentMaybeSingle }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected service table: ${table}`);
    },
  }),
}));

vi.mock('@/lib/razorpay/client', () => ({
  auditRazorpayConfig: () => [],
  detectRazorpayMode: () => 'test',
  maskRazorpayKeyId: () => 'rzp_test_***',
  createPlanOrder: (...args: unknown[]) => createPlanOrder(...args),
}));

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: async () => ({ success: true, remaining: 4 }),
  buildRateLimitHttpResponse: () => null,
}));

vi.mock('@/lib/razorpay/payment-log', () => ({
  paymentLog: vi.fn(),
  paymentError: vi.fn(),
}));

vi.mock('@/lib/analytics/product-events-server', () => ({
  trackProductEventServer: (...args: unknown[]) => trackProductEventServer(...args),
}));

vi.mock('@/lib/campaign-codes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/campaign-codes')>();
  return {
    ...actual,
    reserveCampaignCode: (...args: unknown[]) => reserveCampaignCode(...args),
    attachCampaignOrder: (...args: unknown[]) => attachCampaignOrder(...args),
    releaseCampaignReservation: (...args: unknown[]) => releaseCampaignReservation(...args),
  };
});

import { POST } from './route';

function request(body: unknown): Request {
  return new Request('http://localhost/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/payments/create-order authoritative pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    });
    profileMaybeSingle.mockResolvedValue({
      data: { plan_tier: 'free', plan_status: 'none', plan_expires_at: null },
      error: null,
    });
    paymentInsert.mockResolvedValue({ error: null });
    attachCampaignOrder.mockResolvedValue(true);
    releaseCampaignReservation.mockResolvedValue(true);
    existingPaymentMaybeSingle.mockResolvedValue({ data: null, error: null });
    createPlanOrder.mockImplementation(async ({ plan, amountPaise }) => ({
      order_id: 'order-1',
      amount: amountPaise,
      currency: 'INR',
      key: 'rzp_test_key',
      plan,
    }));
  });

  it('ignores client-supplied amount and charges the canonical list price', async () => {
    const response = await POST(request({ plan: 'pro', amount: 1, price: 1 }));

    expect(response.status).toBe(200);
    expect(createPlanOrder).toHaveBeenCalledWith({
      userId: 'user-1',
      plan: 'pro',
      amountPaise: 79900,
    });
    expect(paymentInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 79900,
        list_amount_paise: 79900,
        discount_paise: 0,
      }),
    );
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'checkout_started',
        user_id: 'user-1',
        plan: 'pro',
        order_id: 'order-1',
        amount: 79900,
      }),
    );
  });

  it('uses the checkout-time reserved quote as the Razorpay order amount', async () => {
    reserveCampaignCode.mockResolvedValue({
      ok: true,
      error_code: null,
      redemption_id: 'redemption-1',
      campaign_code_id: 'campaign-1',
      discount_paise: 9000,
      final_amount_paise: 20900,
      label: 'Launch 30',
      kind: 'promo',
      discount_type: 'percent',
      discount_value: 30,
      starts_at: null,
      expires_at: '2026-08-17T00:00:00.000Z',
      is_active: true,
      server_now: '2026-08-16T12:00:00.000Z',
      reservation_created: true,
      order_id: null,
    });

    const response = await POST(
      request({ plan: 'starter', code: 'LAUNCH30', amount: 100 }),
    );

    expect(response.status).toBe(200);
    expect(reserveCampaignCode).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        plan: 'starter',
        listAmountPaise: 29900,
        promoFloorPaise: 14900,
      }),
    );
    expect(createPlanOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        amountPaise: 20900,
        redemptionId: 'redemption-1',
      }),
    );
    expect(attachCampaignOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        redemptionId: 'redemption-1',
        orderId: 'order-1',
      }),
    );
    expect(paymentInsert).not.toHaveBeenCalled();
  });

  it('reuses the attached order instead of creating a second Razorpay order', async () => {
    reserveCampaignCode.mockResolvedValue({
      ok: true,
      error_code: null,
      redemption_id: 'redemption-1',
      campaign_code_id: 'campaign-1',
      discount_paise: 9000,
      final_amount_paise: 20900,
      reservation_created: false,
      order_id: 'order-existing',
    });
    existingPaymentMaybeSingle.mockResolvedValue({
      data: {
        order_id: 'order-existing',
        amount: 20900,
        currency: 'INR',
        plan: 'starter',
        status: 'created',
        campaign_redemption_id: 'redemption-1',
      },
      error: null,
    });

    const response = await POST(request({ plan: 'starter', code: 'LAUNCH30' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      order_id: 'order-existing',
      amount: 20900,
      reused: true,
    });
    expect(createPlanOrder).not.toHaveBeenCalled();
    expect(attachCampaignOrder).not.toHaveBeenCalled();
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'checkout_started',
        order_id: 'order-existing',
        amount: 20900,
        campaign_code_id: 'campaign-1',
      }),
    );
  });

  it('does not create an order while the owning reservation is still initializing', async () => {
    reserveCampaignCode.mockResolvedValue({
      ok: false,
      error_code: 'CHECKOUT_INITIALIZING',
      redemption_id: 'redemption-1',
      campaign_code_id: 'campaign-1',
      discount_paise: 9000,
      final_amount_paise: 20900,
      reservation_created: false,
      order_id: null,
    });

    const response = await POST(request({ plan: 'starter', code: 'LAUNCH30' }));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'CHECKOUT_INITIALIZING' });
    expect(createPlanOrder).not.toHaveBeenCalled();
  });

  it('releases only its newly-created unbound reservation when provider creation fails', async () => {
    reserveCampaignCode.mockResolvedValue({
      ok: true,
      error_code: null,
      redemption_id: 'redemption-new',
      campaign_code_id: 'campaign-1',
      discount_paise: 9000,
      final_amount_paise: 20900,
      reservation_created: true,
      order_id: null,
    });
    createPlanOrder.mockRejectedValue(new Error('provider unavailable'));

    const response = await POST(request({ plan: 'starter', code: 'LAUNCH30' }));

    expect(response.status).toBe(500);
    expect(releaseCampaignReservation).toHaveBeenCalledWith(
      expect.anything(),
      'redemption-new',
    );
  });

  it('rejects an expired campaign before creating a Razorpay order', async () => {
    reserveCampaignCode.mockResolvedValue({
      ok: false,
      error_code: 'CODE_EXPIRED',
      redemption_id: null,
      campaign_code_id: 'campaign-1',
      discount_paise: 0,
      final_amount_paise: 29900,
    });

    const response = await POST(request({ plan: 'starter', code: 'EXPIRED' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'CODE_EXPIRED' });
    expect(createPlanOrder).not.toHaveBeenCalled();
    expect(paymentInsert).not.toHaveBeenCalled();
    expect(trackProductEventServer).not.toHaveBeenCalled();
  });
});
