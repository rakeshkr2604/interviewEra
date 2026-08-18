import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGetUser = vi.fn();
const paymentMaybeSingle = vi.fn();
const releaseForOrder = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: authGetUser },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table !== 'payments') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({ maybeSingle: paymentMaybeSingle }),
        }),
      };
    },
  }),
}));

vi.mock('@/lib/campaign-codes', () => ({
  releaseCampaignReservationForOrder: (...args: unknown[]) => releaseForOrder(...args),
}));

vi.mock('@/lib/razorpay/payment-log', () => ({
  paymentLog: vi.fn(),
  paymentWarn: vi.fn(),
}));

import { POST } from './route';

function request(orderId: string): Request {
  return new Request('http://localhost/api/payments/release-campaign-reservation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ order_id: orderId }),
  });
}

describe('release campaign reservation route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGetUser.mockResolvedValue({
      data: { user: { id: 'user-a' } },
      error: null,
    });
  });

  it('retains a bound reservation even for its owning user', async () => {
    paymentMaybeSingle.mockResolvedValue({
      data: {
        user_id: 'user-a',
        campaign_redemption_id: 'red-a',
        status: 'failed',
      },
      error: null,
    });
    releaseForOrder.mockResolvedValue({
      released: false,
      redemptionId: 'red-a',
    });

    const response = await POST(request('order-a'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      released: false,
      reason: 'bound_order_retained',
    });
    expect(releaseForOrder).toHaveBeenCalledWith(expect.anything(), 'order-a');
  });

  it('does not expose or release another user order', async () => {
    paymentMaybeSingle.mockResolvedValue({
      data: {
        user_id: 'user-b',
        campaign_redemption_id: 'red-b',
        status: 'created',
      },
      error: null,
    });

    const response = await POST(request('order-b'));

    expect(response.status).toBe(404);
    expect(releaseForOrder).not.toHaveBeenCalled();
  });
});
