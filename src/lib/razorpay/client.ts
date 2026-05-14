import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PLAN_ACTIVATION_CREDITS } from '@/lib/razorpay/plan-credits';

export { PLAN_ACTIVATION_CREDITS };

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Amount in paise (100 paise = ₹1)
const PLAN_AMOUNTS: Record<string, number> = {
  starter: 14900,         // ₹149/mo
  pro: 39900,             // ₹399/mo
  starter_annual: 79900,  // ₹799/yr
  pro_annual: 199900,     // ₹1,999/yr
};

// Configure in Razorpay dashboard, then set in env
const RAZORPAY_PLAN_IDS: Record<string, string> = {
  starter: process.env.RAZORPAY_STARTER_PLAN_ID!,
  pro: process.env.RAZORPAY_PRO_PLAN_ID!,
  starter_annual: process.env.RAZORPAY_STARTER_ANNUAL_PLAN_ID!,
  pro_annual: process.env.RAZORPAY_PRO_ANNUAL_PLAN_ID!,
};

export async function createSubscriptionOrder(
  userId: string,
  plan: 'starter' | 'pro',
  billingCycle: 'monthly' | 'annual' = 'monthly',
): Promise<{ subscriptionId: string; amount: number; currency: string; key: string }> {
  const planKey = billingCycle === 'annual' ? `${plan}_annual` : plan;
  const planId = RAZORPAY_PLAN_IDS[planKey];
  if (!planId) {
    throw new Error(`Razorpay plan ID not configured for: ${planKey}`);
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    // Monthly: 12 billing cycles; Annual: 3 billing cycles (3 years)
    total_count: billingCycle === 'annual' ? 3 : 12,
    notes: { user_id: userId, plan, billing_cycle: billingCycle },
  });

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error('RAZORPAY_KEY_ID is not configured');
  }

  return {
    subscriptionId: subscription.id,
    amount: PLAN_AMOUNTS[planKey],
    currency: 'INR',
    // Must match the key used server-side; avoid NEXT_PUBLIC_* drift on Vercel (causes checkout 401).
    key: keyId,
  };
}

/** Minimum order amount for Razorpay standard checkout (1 INR). */
export const MIN_STANDARD_ORDER_PAISE = 100;

export async function createStandardOrder(params: {
  amount: number;
  currency?: string;
  receipt?: string;
  userId: string;
}): Promise<{ order_id: string; amount: number; currency: string }> {
  const { amount, currency = 'INR', receipt, userId } = params;
  if (amount < MIN_STANDARD_ORDER_PAISE) {
    throw new Error(`Amount must be at least ${MIN_STANDARD_ORDER_PAISE} paise`);
  }
  const receiptId = (
    receipt ?? `ie_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  ).slice(0, 40);

  const order = await razorpay.orders.create({
    amount,
    currency,
    receipt: receiptId,
    notes: { user_id: userId },
  });

  return {
    order_id: order.id,
    amount: typeof order.amount === 'number' ? order.amount : Number(order.amount),
    currency: order.currency,
  };
}

export function verifyStandardPaymentSignature(
  orderId: string,
  paymentId: string,
  clientSignature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error('[razorpay] RAZORPAY_KEY_SECRET is not set');
    return false;
  }
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(clientSignature, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[razorpay] RAZORPAY_WEBHOOK_SECRET is not set');
    return false;
  }
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}
