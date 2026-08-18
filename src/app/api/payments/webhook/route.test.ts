import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
} from '@/lib/env/staging-environment';

const createServiceClient = vi.fn();
const paymentUpdate = vi.fn();
const paymentEq = vi.fn();
const paymentIn = vi.fn();
const paymentSelect = vi.fn();
const activatePlanAfterPayment = vi.fn();
const resolveExpectedOrderAmount = vi.fn();
const trackProductEventServer = vi.fn();
const fetchRazorpayOrder = vi.fn();
const fetchRazorpayPayment = vi.fn();
const verifyWebhookSignature = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: (...args: unknown[]) => createServiceClient(...args),
}));

vi.mock('@/lib/razorpay/client', () => ({
  verifyWebhookSignature: (...args: unknown[]) => verifyWebhookSignature(...args),
  fetchRazorpayOrder: (...args: unknown[]) => fetchRazorpayOrder(...args),
  fetchRazorpayPayment: (...args: unknown[]) => fetchRazorpayPayment(...args),
}));

vi.mock('@/lib/razorpay/activate-plan', () => ({
  activatePlanAfterPayment: (...args: unknown[]) => activatePlanAfterPayment(...args),
}));

vi.mock('@/lib/razorpay/activation-api-response', () => ({
  shouldTrackPaymentCompleted: (result: { activated?: boolean }) => result.activated === true,
}));

vi.mock('@/lib/razorpay/expected-order-amount', () => ({
  resolveExpectedOrderAmount: (...args: unknown[]) => resolveExpectedOrderAmount(...args),
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

function webhook(event: object): Request {
  return new Request('http://localhost/api/payments/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': 'valid',
    },
    body: JSON.stringify(event),
  });
}

const capturedEvent = {
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay-a',
        order_id: 'order-a',
        amount: 20900,
        currency: 'INR',
        status: 'captured',
      },
    },
  },
};

function stubStagingIsolationEnv(overrides: Record<string, string | undefined> = {}): void {
  vi.stubEnv('APP_ENV', 'staging');
  vi.stubEnv('EXPECTED_SUPABASE_PROJECT_REF', STAGING_SUPABASE_PROJECT_REF);
  vi.stubEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`,
  );
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'staging-service-role-key');
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      vi.stubEnv(key, '');
      delete process.env[key];
    } else {
      vi.stubEnv(key, value);
    }
  }
}

describe('Razorpay webhook campaign ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    activatePlanAfterPayment.mockReset();
    createServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table !== 'payments') throw new Error(`Unexpected table: ${table}`);
        return {
          update: paymentUpdate,
        };
      },
    });
    verifyWebhookSignature.mockReturnValue(true);
    fetchRazorpayOrder.mockResolvedValue({
      id: 'order-a',
      amount: 20900,
      currency: 'INR',
      status: 'paid',
      notes: {
        user_id: 'user-a',
        plan: 'starter',
        campaign_redemption_id: 'red-a',
      },
    });
    fetchRazorpayPayment.mockResolvedValue({
      id: 'pay-a',
      order_id: 'order-a',
      amount: 20900,
      currency: 'INR',
      status: 'captured',
    });
    paymentSelect.mockResolvedValue({ data: [{ order_id: 'order-a' }], error: null });
    paymentIn.mockReturnValue({ select: paymentSelect });
    paymentEq.mockReturnValue({ in: paymentIn });
    paymentUpdate.mockReturnValue({ eq: paymentEq });
    resolveExpectedOrderAmount.mockResolvedValue({
      ok: true,
      userId: 'user-a',
      plan: 'starter',
      amountPaise: 20900,
      currency: 'INR',
      campaignRedemptionId: 'red-a',
    });
    activatePlanAfterPayment
      .mockResolvedValueOnce({
        activated: true,
        alreadyActivated: false,
        plan: 'starter',
        planExpiresAt: '2026-09-15T00:00:00.000Z',
      })
      .mockResolvedValue({
        activated: false,
        alreadyActivated: true,
        plan: 'starter',
        planExpiresAt: '2026-09-15T00:00:00.000Z',
      });
  });

  it('marks payment.failed locally without releasing the bound reservation', async () => {
    const response = await POST(
      webhook({
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay-failed',
              order_id: 'order-a',
              amount: 20900,
              currency: 'INR',
              status: 'failed',
            },
          },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
    expect(paymentEq).toHaveBeenCalledWith('order_id', 'order-a');
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'payment_failed',
        user_id: 'user-a',
        order_id: 'order-a',
        payment_id: 'pay-failed',
        amount: 20900,
      }),
    );
  });

  it('dispatches duplicate captured webhooks through idempotent activation', async () => {
    const first = await POST(webhook(capturedEvent));
    const replay = await POST(webhook(capturedEvent));

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(activatePlanAfterPayment).toHaveBeenCalledTimes(2);
    expect(activatePlanAfterPayment).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        orderId: 'order-a',
        paymentId: 'pay-a',
        source: 'webhook',
      }),
    );
    expect(trackProductEventServer).toHaveBeenCalledTimes(1);
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'payment_completed',
        order_id: 'order-a',
        payment_id: 'pay-a',
      }),
    );
  });

  it('validates and activates an order.paid event with provider payment data', async () => {
    const response = await POST(
      webhook({
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: 'order-a',
              amount: 20900,
              currency: 'INR',
              status: 'paid',
              notes: {
                user_id: 'user-a',
                plan: 'starter',
                campaign_redemption_id: 'red-a',
              },
            },
          },
          payment: {
            entity: {
              id: 'pay-a',
              order_id: 'order-a',
              amount: 20900,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchRazorpayPayment).toHaveBeenCalledWith('pay-a');
    expect(activatePlanAfterPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ orderId: 'order-a', paymentId: 'pay-a' }),
    );
  });

  it.each([
    ['amount', { amount: 14900 }],
    ['currency', { currency: 'USD' }],
    ['status', { status: 'authorized' }],
    ['payment identity', { id: 'pay-other' }],
    ['order identity', { order_id: 'order-other' }],
  ])('fails closed on provider payment %s mismatch', async (_name, patch) => {
    fetchRazorpayPayment.mockResolvedValueOnce({
      id: 'pay-a',
      order_id: 'order-a',
      amount: 20900,
      currency: 'INR',
      status: 'captured',
      ...patch,
    });

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(200);
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects an invalid webhook signature before activation', async () => {
    verifyWebhookSignature.mockReturnValueOnce(false);

    const response = await POST(
      webhook({
        event: 'payment.captured',
        payload: { payment: { entity: {} } },
      }),
    );

    expect(response.status).toBe(400);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(fetchRazorpayPayment).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });
});

describe('Razorpay webhook runtime Supabase isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    createServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table !== 'payments') throw new Error(`Unexpected table: ${table}`);
        return { update: paymentUpdate };
      },
    });
    verifyWebhookSignature.mockReturnValue(true);
    fetchRazorpayOrder.mockResolvedValue({
      id: 'order-a',
      amount: 20900,
      currency: 'INR',
      status: 'paid',
      notes: {
        user_id: 'user-a',
        plan: 'starter',
      },
    });
    fetchRazorpayPayment.mockResolvedValue({
      id: 'pay-a',
      order_id: 'order-a',
      amount: 20900,
      currency: 'INR',
      status: 'captured',
    });
    resolveExpectedOrderAmount.mockResolvedValue({
      ok: true,
      userId: 'user-a',
      plan: 'starter',
      amountPaise: 20900,
      currency: 'INR',
      campaignRedemptionId: null,
    });
    activatePlanAfterPayment.mockResolvedValue({
      activated: true,
      alreadyActivated: false,
      plan: 'starter',
      planExpiresAt: '2026-09-15T00:00:00.000Z',
    });
  });

  it('allows production / unset APP_ENV without EXPECTED_SUPABASE_PROJECT_REF', async () => {
    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(200);
    expect(createServiceClient).toHaveBeenCalledTimes(1);
    expect(activatePlanAfterPayment).toHaveBeenCalledTimes(1);
  });

  it('allows VERCEL_ENV=production with APP_ENV missing', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(200);
    expect(createServiceClient).toHaveBeenCalledTimes(1);
    expect(activatePlanAfterPayment).toHaveBeenCalledTimes(1);
  });

  it('allows VERCEL_ENV=production with APP_ENV=production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(200);
    expect(createServiceClient).toHaveBeenCalledTimes(1);
    expect(activatePlanAfterPayment).toHaveBeenCalledTimes(1);
  });

  it('rejects VERCEL_ENV=preview when APP_ENV is missing before DB access', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv(
      'NEXT_PUBLIC_SUPABASE_URL',
      `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
    );

    const response = await POST(webhook(capturedEvent));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Webhook environment isolation failed' });
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
    expect(fetchRazorpayPayment).not.toHaveBeenCalled();
  });

  it('rejects VERCEL_ENV=preview when APP_ENV=production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv(
      'NEXT_PUBLIC_SUPABASE_URL',
      `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
    );

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(500);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('allows staging when Supabase URL matches the certified staging ref', async () => {
    stubStagingIsolationEnv();

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(200);
    expect(createServiceClient).toHaveBeenCalledTimes(1);
    expect(activatePlanAfterPayment).toHaveBeenCalledTimes(1);
  });

  it('allows VERCEL_ENV=preview with APP_ENV=staging and certified staging target', async () => {
    stubStagingIsolationEnv({ VERCEL_ENV: 'preview' });

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(200);
    expect(createServiceClient).toHaveBeenCalledTimes(1);
    expect(activatePlanAfterPayment).toHaveBeenCalledTimes(1);
  });

  it('rejects staging pointed at the production Supabase project before DB access', async () => {
    stubStagingIsolationEnv({
      NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
    });

    const response = await POST(webhook(capturedEvent));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Webhook environment isolation failed' });
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
    expect(fetchRazorpayPayment).not.toHaveBeenCalled();
  });

  it('rejects preview + staging pointed at production Supabase before DB access', async () => {
    stubStagingIsolationEnv({
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
    });

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(500);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects staging with a non-certified Supabase project ref', async () => {
    stubStagingIsolationEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://differentprojectref.supabase.co',
    });

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(500);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects preview + staging with a non-certified Supabase project ref', async () => {
    stubStagingIsolationEnv({
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: 'https://differentprojectref.supabase.co',
    });

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(500);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects staging when EXPECTED_SUPABASE_PROJECT_REF is missing', async () => {
    stubStagingIsolationEnv({
      EXPECTED_SUPABASE_PROJECT_REF: undefined,
    });

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(500);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects preview + staging when EXPECTED_SUPABASE_PROJECT_REF is missing', async () => {
    stubStagingIsolationEnv({
      VERCEL_ENV: 'preview',
      EXPECTED_SUPABASE_PROJECT_REF: undefined,
    });

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(500);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects staging when NEXT_PUBLIC_SUPABASE_URL is missing or invalid', async () => {
    stubStagingIsolationEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    });

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(500);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('rejects preview + staging when NEXT_PUBLIC_SUPABASE_URL is invalid', async () => {
    stubStagingIsolationEnv({
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    });

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(500);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });

  it('still rejects invalid signatures before isolation / DB work', async () => {
    stubStagingIsolationEnv({
      NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
    });
    verifyWebhookSignature.mockReturnValueOnce(false);

    const response = await POST(webhook(capturedEvent));

    expect(response.status).toBe(400);
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(activatePlanAfterPayment).not.toHaveBeenCalled();
  });
});
