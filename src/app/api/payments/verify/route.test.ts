import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const fetchRazorpayOrder = vi.fn();
const fetchRazorpayPayment = vi.fn();
const verifyPaymentSignature = vi.fn();
const resolveExpectedOrderAmount = vi.fn();
const activatePlanAfterPayment = vi.fn();
const trackProductEventServer = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUser(...args) },
  }),
  createServiceClient: () => ({ service: true }),
}));

vi.mock('@/lib/razorpay/client', () => ({
  fetchRazorpayOrder: (...args: unknown[]) => fetchRazorpayOrder(...args),
  fetchRazorpayPayment: (...args: unknown[]) => fetchRazorpayPayment(...args),
  verifyPaymentSignature: (...args: unknown[]) => verifyPaymentSignature(...args),
}));

vi.mock('@/lib/razorpay/expected-order-amount', () => ({
  resolveExpectedOrderAmount: (...args: unknown[]) => resolveExpectedOrderAmount(...args),
}));

vi.mock('@/lib/razorpay/activate-plan', () => ({
  activatePlanAfterPayment: (...args: unknown[]) => activatePlanAfterPayment(...args),
}));

vi.mock('@/lib/razorpay/activation-api-response', () => ({
  toActivationApiBody: (result: { activated: boolean; alreadyActivated: boolean; plan: string; planExpiresAt: string }) => ({
    ok: true,
    ...result,
    activationFailed: false,
  }),
  shouldTrackPaymentCompleted: (result: { activated?: boolean }) => result.activated === true,
}));

vi.mock('@/lib/razorpay/payment-log', () => ({
  paymentError: vi.fn(),
  paymentLog: vi.fn(),
  paymentWarn: vi.fn(),
}));

vi.mock('@/lib/analytics/product-events-server', () => ({
  trackProductEventServer: (...args: unknown[]) => trackProductEventServer(...args),
}));

import { POST } from './route';

const USER_ID = 'user-1';
const ORDER_ID = 'order-1';
const PAYMENT_ID = 'pay-1';

function request(body: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/payments/verify', {
    method: 'POST',
    body: JSON.stringify({
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAYMENT_ID,
      razorpay_signature: 'valid-signature',
      ...body,
    }),
  });
}

function providerOrder(amount = 20900, plan: 'starter' | 'pro' = 'starter') {
  const isFullPrice = amount === 29900 || amount === 79800 || amount === 79900;
  return {
    id: ORDER_ID,
    amount,
    currency: 'INR',
    status: 'paid',
    notes: {
      user_id: USER_ID,
      plan,
      ...(isFullPrice ? {} : { campaign_redemption_id: 'red-1' }),
    },
  };
}

function providerPayment(amount = 20900) {
  return {
    id: PAYMENT_ID,
    order_id: ORDER_ID,
    amount,
    currency: 'INR',
    status: 'captured',
  };
}

describe('POST /api/payments/verify provider validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'test-key-secret');
    getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    verifyPaymentSignature.mockReturnValue(true);
    fetchRazorpayOrder.mockResolvedValue(providerOrder());
    fetchRazorpayPayment.mockResolvedValue(providerPayment());
    resolveExpectedOrderAmount.mockResolvedValue({
      ok: true,
      userId: USER_ID,
      plan: 'starter',
      amountPaise: 20900,
      currency: 'INR',
      campaignRedemptionId: 'red-1',
      attributionSnapshot: null,
    });
    activatePlanAfterPayment.mockResolvedValue({
      activated: true,
      alreadyActivated: false,
      plan: 'starter',
      planExpiresAt: '2026-09-16T00:00:00.000Z',
    });
  });

  it.each([
    ['Starter full', 29900, 'starter'],
    ['Pro full (historical ₹798)', 79800, 'pro'],
    ['Pro full (current ₹799)', 79900, 'pro'],
    ['Starter 30%', 20900, 'starter'],
    ['Starter 50%', 14900, 'starter'],
    ['Pro 30%', 55900, 'pro'],
    ['Pro 50%', 39900, 'pro'],
  ] as const)('accepts frozen %s amount', async (_name, amount, plan) => {
    fetchRazorpayOrder.mockResolvedValueOnce(providerOrder(amount, plan));
    fetchRazorpayPayment.mockResolvedValueOnce(providerPayment(amount));
    resolveExpectedOrderAmount.mockResolvedValueOnce({
      ok: true,
      userId: USER_ID,
      plan,
      amountPaise: amount,
      currency: 'INR',
      campaignRedemptionId:
        amount === 29900 || amount === 79800 || amount === 79900 ? null : 'red-1',
      attributionSnapshot: null,
    });
    activatePlanAfterPayment.mockResolvedValueOnce({
      activated: true,
      alreadyActivated: false,
      plan,
      planExpiresAt: '2026-09-16T00:00:00.000Z',
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(activatePlanAfterPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ plan, amountPaise: amount }),
    );
  });

  it.each([
    ['lower amount', () => fetchRazorpayPayment.mockResolvedValueOnce(providerPayment(20899))],
    ['higher amount', () => fetchRazorpayPayment.mockResolvedValueOnce(providerPayment(20901))],
    ['USD currency', () => fetchRazorpayPayment.mockResolvedValueOnce({ ...providerPayment(), currency: 'USD' })],
    ['EUR currency', () => fetchRazorpayPayment.mockResolvedValueOnce({ ...providerPayment(), currency: 'EUR' })],
    ['empty currency', () => fetchRazorpayPayment.mockResolvedValueOnce({ ...providerPayment(), currency: '' })],
    ['malformed currency', () => fetchRazorpayPayment.mockResolvedValueOnce({ ...providerPayment(), currency: 'INR ' })],
    ['wrong payment ID', () => fetchRazorpayPayment.mockResolvedValueOnce({ ...providerPayment(), id: 'pay-other' })],
    ['wrong payment order', () => fetchRazorpayPayment.mockResolvedValueOnce({ ...providerPayment(), order_id: 'order-other' })],
    ['uncaptured payment', () => fetchRazorpayPayment.mockResolvedValueOnce({ ...providerPayment(), status: 'authorized' })],
  ])('fails closed for provider %s', async (_name, arrange) => {
    arrange();

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects an invalid client signature before provider fetch or activation', async () => {
    verifyPaymentSignature.mockReturnValueOnce(false);

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(fetchRazorpayOrder).not.toHaveBeenCalled();
    expect(fetchRazorpayPayment).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects wrong local owner and preserves activation', async () => {
    resolveExpectedOrderAmount.mockResolvedValueOnce({
      ok: true,
      userId: 'user-other',
      plan: 'starter',
      amountPaise: 20900,
      currency: 'INR',
      campaignRedemptionId: null,
      attributionSnapshot: null,
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects order-note user and plan mismatches', async () => {
    fetchRazorpayOrder.mockResolvedValueOnce({
      ...providerOrder(),
      notes: { user_id: USER_ID, plan: 'pro' },
    });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Phase 5: attribution immutability + payment_completed event
// ---------------------------------------------------------------------------

describe('POST /api/payments/verify payment_completed attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RAZORPAY_KEY_SECRET', 'test-key-secret');
    getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    verifyPaymentSignature.mockReturnValue(true);
    fetchRazorpayOrder.mockResolvedValue(providerOrder());
    fetchRazorpayPayment.mockResolvedValue(providerPayment());
    activatePlanAfterPayment.mockResolvedValue({
      activated: true,
      alreadyActivated: false,
      plan: 'starter',
      planExpiresAt: '2026-09-16T00:00:00.000Z',
    });
  });

  // 1. payment_completed includes attribution from payment snapshot
  it('1: payment_completed event includes utm fields from attribution_snapshot', async () => {
    resolveExpectedOrderAmount.mockResolvedValue({
      ok: true,
      userId: USER_ID,
      plan: 'starter',
      amountPaise: 20900,
      currency: 'INR',
      campaignRedemptionId: 'red-1',
      attributionSnapshot: { utm_source: 'google', utm_campaign: 'summer' },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'payment_completed',
        utm_source: 'google',
        utm_campaign: 'summer',
      }),
    );
  });

  // 2. Attribution snapshot survives payment; completion event does not change it
  it('2: payment_completed attribution uses snapshot, not current cookie/user state', async () => {
    resolveExpectedOrderAmount.mockResolvedValue({
      ok: true,
      userId: USER_ID,
      plan: 'starter',
      amountPaise: 20900,
      currency: 'INR',
      campaignRedemptionId: 'red-1',
      // Snapshot reflects original acquisition; later user state is irrelevant
      attributionSnapshot: { utm_source: 'original_source' },
    });

    const laterCookieRequest = new Request('http://localhost/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'ie_attribution=' + encodeURIComponent(JSON.stringify({ utm_source: 'later_source' })),
      },
      body: JSON.stringify({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: 'valid-signature',
      }),
    });

    const response = await POST(laterCookieRequest);

    expect(response.status).toBe(200);
    const callArg = trackProductEventServer.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg?.utm_source).toBe('original_source');
    expect(callArg?.utm_source).not.toBe('later_source');
  });

  // 3. Missing attribution_snapshot → payment_completed succeeds without UTM fields
  it('3: missing attribution_snapshot does not break payment_completed event', async () => {
    resolveExpectedOrderAmount.mockResolvedValue({
      ok: true,
      userId: USER_ID,
      plan: 'starter',
      amountPaise: 20900,
      currency: 'INR',
      campaignRedemptionId: 'red-1',
      attributionSnapshot: null,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({ event_name: 'payment_completed' }),
    );
    const callArg = trackProductEventServer.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('utm_source');
  });

  // 4. Campaign payment + attribution both present — uses default campaignRedemptionId: 'red-1'
  it('4: campaign payment with attribution_snapshot includes both in payment_completed', async () => {
    resolveExpectedOrderAmount.mockResolvedValue({
      ok: true,
      userId: USER_ID,
      plan: 'starter',
      amountPaise: 20900,
      currency: 'INR',
      campaignRedemptionId: 'red-1',
      attributionSnapshot: { utm_source: 'twitter', utm_medium: 'social' },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'payment_completed',
        utm_source: 'twitter',
        utm_medium: 'social',
      }),
    );
  });

  // 5. Idempotent retry (alreadyActivated) does not re-track payment_completed
  it('5: idempotent retry does not emit duplicate payment_completed event', async () => {
    resolveExpectedOrderAmount.mockResolvedValue({
      ok: true,
      userId: USER_ID,
      plan: 'starter',
      amountPaise: 20900,
      currency: 'INR',
      campaignRedemptionId: 'red-1',
      attributionSnapshot: { utm_source: 'google' },
    });
    activatePlanAfterPayment.mockResolvedValue({
      activated: false,
      alreadyActivated: true,
      plan: 'starter',
      planExpiresAt: '2026-09-16T00:00:00.000Z',
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    // shouldTrackPaymentCompleted returns false for alreadyActivated
    expect(trackProductEventServer).not.toHaveBeenCalled();
  });
});
