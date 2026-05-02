import Razorpay from 'razorpay';
import crypto from 'crypto';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Amount in paise (100 paise = ₹1)
const PLAN_AMOUNTS: Record<string, number> = {
  starter: 9900,          // ₹99/mo
  pro: 24900,             // ₹249/mo
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

// Credits granted at subscription.activated webhook
// Annual = 12 months × monthly credits (full year upfront)
export const PLAN_ACTIVATION_CREDITS: Record<string, number> = {
  starter: 12,
  pro: 30,
  starter_annual: 144,  // 12 × 12
  pro_annual: 360,      // 30 × 12
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

  return {
    subscriptionId: subscription.id,
    amount: PLAN_AMOUNTS[planKey],
    currency: 'INR',
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  };
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
