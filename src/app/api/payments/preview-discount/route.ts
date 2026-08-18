/**
 * POST /api/payments/preview-discount — quote a campaign code without reserving.
 * Auth required. Server-authoritative discount; never trust client amounts.
 */

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getPaidPlan, isPaidPlanId } from '@/lib/pricing/plans';
import { paymentPreviewDiscountSchema } from '@/lib/validations/schemas';
import {
  CAMPAIGN_DISCOUNT_USER_MESSAGES,
  quoteCampaignDiscount,
  type CampaignDiscountErrorCode,
} from '@/lib/campaign-codes';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = paymentPreviewDiscountSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { plan, code, coupon_attempt_id } = validation.data;
  if (!isPaidPlanId(plan)) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
  }

  const planConfig = getPaidPlan(plan);
  const listAmountPaise = planConfig.amountPaise;
  const svc = createServiceClient();
  const quote = await quoteCampaignDiscount(svc, {
    code,
    plan,
    listAmountPaise,
    promoFloorPaise: planConfig.promoFloorPaise,
  });

  if (!quote.ok) {
    const errCode = (quote.error_code ?? 'CODE_INVALID') as CampaignDiscountErrorCode;
    return NextResponse.json(
      {
        ok: false,
        error: CAMPAIGN_DISCOUNT_USER_MESSAGES[errCode] ?? 'Invalid code.',
        code: errCode,
      },
      { status: 400 },
    );
  }

  if (quote.is_active) {
    trackProductEventServer({
      event_name: 'coupon_applied',
      user_id: user.id,
      plan,
      campaign_code: code,
      campaign_code_id: quote.campaign_code_id ?? undefined,
      discount_paise: quote.discount_paise,
      final_amount_paise: quote.final_amount_paise,
      coupon_attempt_id,
      source: 'preview_discount',
    });
  }

  return NextResponse.json({
    ok: true,
    code,
    campaign_code_id: quote.campaign_code_id,
    label: quote.label,
    kind: quote.kind,
    discount_type: quote.discount_type,
    discount_value: quote.discount_value,
    list_amount_paise: listAmountPaise,
    discount_paise: quote.discount_paise,
    final_amount_paise: quote.final_amount_paise,
    startsAt: quote.starts_at,
    expiresAt: quote.expires_at,
    isActive: quote.is_active,
    serverNow: quote.server_now,
  });
}

export const runtime = 'nodejs';
