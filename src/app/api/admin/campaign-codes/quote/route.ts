/**
 * POST /api/admin/campaign-codes/quote — Test Quote without reserving.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getPaidPlan, isPaidPlanId } from '@/lib/pricing/plans';
import {
  CAMPAIGN_DISCOUNT_USER_MESSAGES,
  quoteCampaignDiscount,
  type CampaignDiscountErrorCode,
} from '@/lib/campaign-codes';

const schema = z.object({
  plan: z.enum(['starter', 'pro']),
  code: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }

  const { plan, code } = parsed.data;
  if (!isPaidPlanId(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const planConfig = getPaidPlan(plan);
  const listAmountPaise = planConfig.amountPaise;
  const svc = createServiceClient();
  const quote = await quoteCampaignDiscount(svc, {
    code: code.trim().toUpperCase(),
    plan,
    listAmountPaise,
    promoFloorPaise: planConfig.promoFloorPaise,
  });

  if (!quote.ok) {
    const errCode = (quote.error_code ?? 'CODE_INVALID') as CampaignDiscountErrorCode;
    return NextResponse.json({
      ok: false,
      error_code: errCode,
      error: CAMPAIGN_DISCOUNT_USER_MESSAGES[errCode] ?? 'Invalid code',
      list_amount_paise: listAmountPaise,
    });
  }

  return NextResponse.json({
    ok: true,
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
