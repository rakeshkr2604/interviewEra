import Razorpay from 'razorpay';
import crypto from 'crypto';
import {
  assertRazorpayProductionReady,
  auditRazorpayConfig,
  detectRazorpayMode,
  maskRazorpayKeyId,
} from '@/lib/razorpay/config';
import { getPaidPlan, type PaidPlanId } from '@/lib/pricing/plans';
import { paymentError, paymentLog } from '@/lib/razorpay/payment-log';
import { verifyOrderPaymentSignature } from '@/lib/razorpay/payment-signature';

export { auditRazorpayConfig, detectRazorpayMode, maskRazorpayKeyId };

let razorpayClient: Razorpay | null = null;

/** Lazy singleton — avoids Razorpay SDK init during Next.js build (CI has no keys). */
function getRazorpayClient(): Razorpay {
  if (razorpayClient) return razorpayClient;
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId) {
    throw new Error('RAZORPAY_KEY_ID is not configured');
  }
  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret ?? '',
  });
  return razorpayClient;
}

export const MIN_ORDER_PAISE = 100;

export async function createPlanOrder(params: {
  userId: string;
  plan: PaidPlanId;
  /** Server-computed amount (list or discounted). Defaults to plan list price. */
  amountPaise?: number;
  /** Campaign redemption/checkout-attempt identity for provider correlation. */
  redemptionId?: string;
}): Promise<{
  order_id: string;
  amount: number;
  currency: string;
  key: string;
  plan: PaidPlanId;
}> {
  assertRazorpayProductionReady();

  const planConfig = getPaidPlan(params.plan);
  const amountPaise = params.amountPaise ?? planConfig.amountPaise;
  if (!Number.isFinite(amountPaise) || amountPaise < MIN_ORDER_PAISE) {
    throw new Error(`Invalid order amount: ${amountPaise}`);
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error('RAZORPAY_KEY_ID is not configured');
  }

  const receiptId = `ie_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`.slice(
    0,
    40,
  );

  paymentLog('create-order', 'request', {
    userId: params.userId,
    plan: params.plan,
    amountPaise,
    mode: detectRazorpayMode(keyId),
    keyIdMasked: maskRazorpayKeyId(keyId),
  });

  let order: { id: string; amount: number | string; currency: string };
  try {
    order = await getRazorpayClient().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        user_id: params.userId,
        plan: params.plan,
        ...(params.redemptionId ? { campaign_redemption_id: params.redemptionId } : {}),
      },
    });
  } catch (err) {
    paymentError('create-order', 'razorpay_api_failed', {
      userId: params.userId,
      plan: params.plan,
      error: err instanceof Error ? err.message : 'unknown',
    });
    throw err;
  }

  paymentLog('create-order', 'success', {
    userId: params.userId,
    plan: params.plan,
    orderId: order.id,
    amountPaise,
  });

  return {
    order_id: order.id,
    amount: typeof order.amount === 'number' ? order.amount : Number(order.amount),
    currency: order.currency,
    key: keyId,
    plan: params.plan,
  };
}

export async function fetchRazorpayOrder(orderId: string): Promise<{
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes: Record<string, string>;
}> {
  const order = await getRazorpayClient().orders.fetch(orderId);
  return {
    id: order.id as string,
    amount: typeof order.amount === 'number' ? order.amount : Number(order.amount),
    currency: order.currency as string,
    status: order.status as string,
    notes: (order.notes ?? {}) as Record<string, string>,
  };
}

export async function fetchRazorpayPayment(paymentId: string): Promise<{
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}> {
  const payment = await getRazorpayClient().payments.fetch(paymentId);
  return {
    id: payment.id as string,
    order_id: payment.order_id as string,
    amount: typeof payment.amount === 'number' ? payment.amount : Number(payment.amount),
    currency: payment.currency as string,
    status: payment.status as string,
  };
}

function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function timingSafeHexEqual(expected: string, actual: string): boolean {
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(actual, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  clientSignature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    paymentError('verify', 'missing_key_secret', {});
    return false;
  }
  return verifyOrderPaymentSignature(orderId, paymentId, clientSignature, secret);
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    paymentError('webhook', 'missing_webhook_secret', {});
    return false;
  }
  try {
    const expected = hmacSha256Hex(secret, body);
    return timingSafeHexEqual(expected, signature);
  } catch {
    return false;
  }
}
