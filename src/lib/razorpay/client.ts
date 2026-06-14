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

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const MIN_ORDER_PAISE = 100;

export async function createPlanOrder(params: {
  userId: string;
  plan: PaidPlanId;
}): Promise<{
  order_id: string;
  amount: number;
  currency: string;
  key: string;
  plan: PaidPlanId;
}> {
  assertRazorpayProductionReady();

  const planConfig = getPaidPlan(params.plan);
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
    amountPaise: planConfig.amountPaise,
    mode: detectRazorpayMode(keyId),
    keyIdMasked: maskRazorpayKeyId(keyId),
  });

  let order: { id: string; amount: number | string; currency: string };
  try {
    order = await razorpay.orders.create({
      amount: planConfig.amountPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: { user_id: params.userId, plan: params.plan },
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
    amountPaise: planConfig.amountPaise,
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
  const order = await razorpay.orders.fetch(orderId);
  return {
    id: order.id as string,
    amount: typeof order.amount === 'number' ? order.amount : Number(order.amount),
    currency: order.currency as string,
    status: order.status as string,
    notes: (order.notes ?? {}) as Record<string, string>,
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
