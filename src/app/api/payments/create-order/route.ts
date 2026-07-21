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
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';
import { paymentCreateOrderSchema } from '@/lib/validations/schemas';
import type { PlanTier } from '@/types/app.types';
import { paymentError, paymentLog } from '@/lib/razorpay/payment-log';
import {
  CAMPAIGN_DISCOUNT_USER_MESSAGES,
  releaseCampaignReservation,
  reserveCampaignCode,
  type CampaignDiscountErrorCode,
} from '@/lib/campaign-codes';

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

  const rateLimit = await checkRateLimit(`payment:${user.id}`, 60, 5, { failClosed: true });
  const blocked = buildRateLimitHttpResponse(
    rateLimit,
    'Too many requests. Please wait before trying again.',
  );
  if (blocked) {
    return NextResponse.json(blocked.body, {
      status: blocked.status,
      headers: { ...blocked.headers, 'X-RateLimit-Remaining': '0' },
    });
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

  const { plan, code: rawCode } = validation.data;
  const code = rawCode && rawCode.length > 0 ? rawCode : undefined;

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

  const planConfig = getPaidPlan(plan);
  const listAmountPaise = planConfig.amountPaise;
  let finalAmountPaise = listAmountPaise;
  let discountPaise = 0;
  let campaignCodeId: string | null = null;
  let redemptionId: string | null = null;

  const service = createServiceClient();

  if (code) {
    const reserved = await reserveCampaignCode(service, {
      userId: user.id,
      code,
      plan,
      listAmountPaise,
    });
    if (!reserved.ok || !reserved.redemption_id) {
      const errCode = (reserved.error_code ?? 'CODE_INVALID') as CampaignDiscountErrorCode;
      return NextResponse.json(
        {
          error: CAMPAIGN_DISCOUNT_USER_MESSAGES[errCode] ?? 'Invalid code.',
          code: errCode,
        },
        { status: 400 },
      );
    }
    finalAmountPaise = reserved.final_amount_paise;
    discountPaise = reserved.discount_paise;
    campaignCodeId = reserved.campaign_code_id;
    redemptionId = reserved.redemption_id;
  }

  paymentLog('create-order', 'create_order_start', {
    user_id: user.id,
    plan,
    mode: detectRazorpayMode(process.env.RAZORPAY_KEY_ID),
    discount_paise: discountPaise,
  });

  try {
    const order = await createPlanOrder({
      userId: user.id,
      plan,
      amountPaise: finalAmountPaise,
    });

    if (redemptionId) {
      await service
        .from('campaign_code_redemptions')
        .update({ order_id: order.order_id, updated_at: new Date().toISOString() })
        .eq('id', redemptionId);
    }

    const { error: insertErr } = await service.from('payments').insert({
      user_id: user.id,
      order_id: order.order_id,
      amount: finalAmountPaise,
      currency: 'INR',
      status: 'created',
      plan,
      gateway: 'razorpay',
      campaign_code_id: campaignCodeId,
      campaign_redemption_id: redemptionId,
      list_amount_paise: listAmountPaise,
      discount_paise: discountPaise,
    });

    if (insertErr) {
      if (redemptionId) {
        await releaseCampaignReservation(service, redemptionId);
      }
      paymentError('create-order', 'payment_row_insert_failed', {
        user_id: user.id,
        order_id: order.order_id,
        code: insertErr.code,
      });
      return NextResponse.json(
        { error: 'Failed to initialize payment. Please try again.' },
        { status: 500 },
      );
    }

    paymentLog('create-order', 'create_order_done', {
      user_id: user.id,
      order_id: order.order_id,
      plan,
      amount: finalAmountPaise,
    });

    return NextResponse.json({
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      key: order.key,
      plan: order.plan,
      list_amount_paise: listAmountPaise,
      discount_paise: discountPaise,
    });
  } catch (err) {
    if (redemptionId) {
      await releaseCampaignReservation(service, redemptionId);
    }
    const message = err instanceof Error ? err.message : 'unknown';
    paymentError('create-order', 'api_failed', {
      user_id: user.id,
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
