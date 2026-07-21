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

  const { plan, code } = validation.data;
  if (!isPaidPlanId(plan)) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
  }

  const listAmountPaise = getPaidPlan(plan).amountPaise;
  const svc = createServiceClient();
  const quote = await quoteCampaignDiscount(svc, { code, plan, listAmountPaise });

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

  return NextResponse.json({
    ok: true,
    code,
    label: quote.label,
    kind: quote.kind,
    list_amount_paise: listAmountPaise,
    discount_paise: quote.discount_paise,
    final_amount_paise: quote.final_amount_paise,
  });
}

export const runtime = 'nodejs';
