import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  auditRazorpayConfig,
  createPlanOrder,
  detectRazorpayMode,
  maskRazorpayKeyId,
} from '@/lib/razorpay/client';
import { getPaidPlan, isPaidPlanId } from '@/lib/pricing/plans';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { paymentCreateOrderSchema } from '@/lib/validations/schemas';
import type { PlanTier } from '@/types/app.types';
import { paymentError, paymentLog } from '@/lib/razorpay/payment-log';

const TIER_ORDER: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  campus: 3,
  campus_admin: 3,
};

export async function POST(request: Request): Promise<NextResponse> {
  const configIssues = auditRazorpayConfig().filter((i) => i.severity === 'critical');
  if (configIssues.length > 0) {
    paymentError('create-order', 'misconfigured', {
      codes: configIssues.map((i) => i.code),
      mode: detectRazorpayMode(process.env.RAZORPAY_KEY_ID),
      keyIdMasked: maskRazorpayKeyId(process.env.RAZORPAY_KEY_ID),
    });
    return NextResponse.json(
      {
        error:
          'Payment system is misconfigured. Please contact support@interviewera.com (code: RAZORPAY_CONFIG).',
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`payment:${user.id}`, 60, 5);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.resetInSeconds),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = paymentCreateOrderSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    );
  }

  const { plan } = validation.data;

  if (plan === 'campus') {
    return NextResponse.json(
      { error: 'Campus plan requires direct enrollment. Contact us at campus@interviewera.com' },
      { status: 400 },
    );
  }

  if (!isPaidPlanId(plan)) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('plan_tier, plan_status, plan_expires_at')
    .eq('id', user.id)
    .maybeSingle();

  const currentTier = (profile?.plan_tier ?? 'free') as PlanTier;
  if (currentTier === 'campus' || currentTier === 'campus_admin') {
    return NextResponse.json(
      { error: 'Campus plans are managed by your institution.' },
      { status: 400 },
    );
  }

  const newTier = TIER_ORDER[plan];
  const existingTier = TIER_ORDER[currentTier] ?? 0;
  const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at as string) : null;
  const isActivePaid =
    profile?.plan_status === 'active' &&
    expiresAt &&
    expiresAt > new Date() &&
    (currentTier === 'starter' || currentTier === 'pro');

  if (isActivePaid && existingTier > newTier) {
    return NextResponse.json(
      {
        error:
          'You already have a higher active plan. Wait until it expires before switching to a lower tier, or renew your current plan from Settings.',
      },
      { status: 409 },
    );
  }

  paymentLog('create-order', 'api_request', {
    userId: user.id,
    plan,
    mode: detectRazorpayMode(process.env.RAZORPAY_KEY_ID),
  });

  try {
    const order = await createPlanOrder({ userId: user.id, plan });
    const planConfig = getPaidPlan(plan);

    const service = createServiceClient();
    const { error: insertErr } = await service.from('payments').insert({
      user_id: user.id,
      order_id: order.order_id,
      amount: planConfig.amountPaise,
      currency: 'INR',
      status: 'created',
      plan,
      gateway: 'razorpay',
    });

    if (insertErr) {
      paymentError('create-order', 'payment_row_insert_failed', {
        userId: user.id,
        orderId: order.order_id,
        code: insertErr.code,
      });
      return NextResponse.json(
        { error: 'Failed to initialize payment. Please try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      key: order.key,
      plan: order.plan,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    paymentError('create-order', 'api_failed', {
      userId: user.id,
      plan,
      error: message,
    });

    const isConfig = message.includes('Razorpay configuration invalid');
    return NextResponse.json(
      {
        error: isConfig
          ? 'Payment system is misconfigured. Please contact support@interviewera.com.'
          : 'Failed to create payment order. Please try again.',
      },
      { status: isConfig ? 503 : 500 },
    );
  }
}
