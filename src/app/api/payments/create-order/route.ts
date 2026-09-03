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
  attachCampaignOrder,
  CAMPAIGN_DISCOUNT_USER_MESSAGES,
  releaseCampaignReservation,
  reserveCampaignCode,
  type CampaignDiscountErrorCode,
} from '@/lib/campaign-codes';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import {
  chooseCheckoutAmount,
  getEffectivePlanPrice,
  type EffectivePlanPrice,
} from '@/lib/pricing/effective-price';
import {
  type Attribution,
  getAttributionFromRequest,
  hasAttribution,
  normalizeAttribution,
} from '@/lib/analytics/attribution';

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
    .select('plan_tier, plan_status, plan_expires_at, first_touch_attribution')
    .eq('id', user.id)
    .maybeSingle();

  // Resolve attribution snapshot:
  //   1. Authenticated user's DB first-touch (server-written at signup, immutable)
  //   2. Server request cookie (ie_attribution) as fallback
  //   3. NULL — payment creation always succeeds regardless
  const resolvedFirstTouch = normalizeAttribution(
    (profile as Record<string, unknown> | null)?.first_touch_attribution,
  );
  const attributionSnapshot: Attribution | null = hasAttribution(resolvedFirstTouch)
    ? resolvedFirstTouch
    : hasAttribution(getAttributionFromRequest(request))
      ? getAttributionFromRequest(request)
      : null;

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
  let ownsNewReservation = false;
  let pricingCampaignId: string | null = null;

  const service = createServiceClient();
  let campaignPrice: EffectivePlanPrice;
  try {
    campaignPrice = await getEffectivePlanPrice({ svc: service, plan });
  } catch (error) {
    paymentError('create-order', 'pricing_campaign_load_failed', {
      user_id: user.id,
      plan,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json(
      { error: 'Failed to calculate price. Please try again.' },
      { status: 500 },
    );
  }

  if (code) {
    const reserved = await reserveCampaignCode(service, {
      userId: user.id,
      code,
      plan,
      listAmountPaise,
      promoFloorPaise: planConfig.promoFloorPaise,
    });
    if (!reserved.ok || !reserved.redemption_id) {
      const errCode = (reserved.error_code ?? 'CODE_INVALID') as CampaignDiscountErrorCode;
      return NextResponse.json(
        {
          error: CAMPAIGN_DISCOUNT_USER_MESSAGES[errCode] ?? 'Invalid code.',
          code: errCode,
        },
        { status: errCode === 'CHECKOUT_INITIALIZING' ? 409 : 400 },
      );
    }
    finalAmountPaise = reserved.final_amount_paise;
    discountPaise = reserved.discount_paise;
    campaignCodeId = reserved.campaign_code_id;
    redemptionId = reserved.redemption_id;
    ownsNewReservation = reserved.reservation_created;

    if (!reserved.reservation_created) {
      if (!reserved.order_id) {
        return NextResponse.json(
          {
            error: CAMPAIGN_DISCOUNT_USER_MESSAGES.CHECKOUT_INITIALIZING,
            code: 'CHECKOUT_INITIALIZING',
          },
          { status: 409 },
        );
      }

      const { data: existingPayment, error: existingPaymentError } = await service
        .from('payments')
        .select('order_id, amount, currency, plan, status, campaign_redemption_id')
        .eq('order_id', reserved.order_id)
        .eq('user_id', user.id)
        .eq('campaign_redemption_id', reserved.redemption_id)
        .maybeSingle();

      if (
        existingPaymentError ||
        !existingPayment ||
        existingPayment.amount !== reserved.final_amount_paise ||
        existingPayment.plan !== plan
      ) {
        paymentError('create-order', 'existing_campaign_order_mismatch', {
          user_id: user.id,
          order_id: reserved.order_id,
          redemption_id: reserved.redemption_id,
          code: existingPaymentError?.code,
        });
        return NextResponse.json(
          { error: 'Unable to resume this checkout. Please contact support.' },
          { status: 409 },
        );
      }

      if (existingPayment.status === 'paid') {
        return NextResponse.json(
          { error: 'This payment has already been completed.' },
          { status: 409 },
        );
      }

      paymentLog('create-order', 'existing_campaign_order_reused', {
        user_id: user.id,
        order_id: existingPayment.order_id,
        redemption_id: reserved.redemption_id,
      });

      trackProductEventServer({
        event_name: 'checkout_started',
        user_id: user.id,
        plan: existingPayment.plan,
        order_id: existingPayment.order_id,
        amount: existingPayment.amount,
        campaign_code_id: campaignCodeId ?? undefined,
        discount_paise: discountPaise,
        final_amount_paise: existingPayment.amount,
        source: 'create_order_reused',
      });

      return NextResponse.json({
        order_id: existingPayment.order_id,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        key: process.env.RAZORPAY_KEY_ID,
        plan: existingPayment.plan,
        list_amount_paise: listAmountPaise,
        discount_paise: discountPaise,
        reused: true,
      });
    }

    const decision = chooseCheckoutAmount({
      listAmountPaise,
      campaign: campaignPrice,
      coupon: {
        final_amount_paise: reserved.final_amount_paise,
        discount_paise: reserved.discount_paise,
      },
    });
    if (decision.source === 'campaign') {
      if (ownsNewReservation && redemptionId) {
        await releaseCampaignReservation(service, redemptionId);
      }
      ownsNewReservation = false;
      redemptionId = null;
      campaignCodeId = null;
      finalAmountPaise = decision.finalAmountPaise;
      discountPaise = decision.discountPaise;
      pricingCampaignId = decision.pricingCampaignId;
    }
  } else {
    const decision = chooseCheckoutAmount({
      listAmountPaise,
      campaign: campaignPrice,
      coupon: null,
    });
    finalAmountPaise = decision.finalAmountPaise;
    discountPaise = decision.discountPaise;
    pricingCampaignId = decision.pricingCampaignId;
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
      ...(redemptionId ? { redemptionId } : {}),
    });

    if (redemptionId) {
      const attached = await attachCampaignOrder(service, {
        redemptionId,
        userId: user.id,
        orderId: order.order_id,
        currency: order.currency,
        attributionSnapshot,
      });

      if (!attached) {
        await releaseCampaignReservation(service, redemptionId);
        paymentError('create-order', 'campaign_order_attach_failed', {
          user_id: user.id,
          order_id: order.order_id,
          redemption_id: redemptionId,
        });
        return NextResponse.json(
          { error: 'Failed to initialize payment. Please try again.' },
          { status: 500 },
        );
      }
    } else {
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
        ...(pricingCampaignId ? { pricing_campaign_id: pricingCampaignId } : {}),
        attribution_snapshot: attributionSnapshot,
      });

      if (insertErr) {
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
    }

    paymentLog('create-order', 'create_order_done', {
      user_id: user.id,
      order_id: order.order_id,
      plan,
      amount: finalAmountPaise,
    });

    trackProductEventServer({
      event_name: 'checkout_started',
      user_id: user.id,
      plan: order.plan,
      order_id: order.order_id,
      amount: order.amount,
      campaign_code_id: campaignCodeId ?? undefined,
      pricing_campaign_id: pricingCampaignId ?? undefined,
      discount_paise: discountPaise,
      final_amount_paise: order.amount,
      source: 'create_order',
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
    if (redemptionId && ownsNewReservation) {
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
