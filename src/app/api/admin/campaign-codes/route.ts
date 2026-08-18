/**
 * GET/POST /api/admin/campaign-codes — list / create campaign codes.
 * PATCH via /api/admin/campaign-codes/[id]
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import {
  computeCampaignDiscountQuote,
  normalizeCampaignCode,
} from '@/lib/campaign-codes';
import { getPaidPlan, type PaidPlanId } from '@/lib/pricing/plans';

const createSchema = z.object({
  code: z.string().min(2).max(64),
  kind: z.enum(['promo', 'sponsorship']),
  label: z.string().min(1).max(120),
  partner_name: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  discount_type: z.enum(['percent', 'flat_paise']),
  discount_value: z.number().int().nonnegative(),
  applies_to_plans: z.array(z.enum(['starter', 'pro'])).optional().default([]),
  max_redemptions: z.number().int().positive().optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

function validateCampaignPricing(input: z.infer<typeof createSchema>): string | null {
  if (input.starts_at && input.expires_at && input.starts_at >= input.expires_at) {
    return 'Campaign end must be after its start.';
  }

  const plans: PaidPlanId[] =
    input.applies_to_plans.length > 0 ? input.applies_to_plans : ['starter', 'pro'];
  for (const plan of plans) {
    const config = getPaidPlan(plan);
    const quote = computeCampaignDiscountQuote({
      listAmountPaise: config.amountPaise,
      promoFloorPaise: config.promoFloorPaise,
      discountType: input.discount_type,
      discountValue: input.discount_value,
    });
    if (!quote.ok) {
      return quote.error_code === 'CODE_DISCOUNT_INVALID'
        ? 'Discount must be between 0% and 50% and use integer-safe values.'
        : `${config.label} final price cannot be below ₹${config.promoFloorPaise / 100}.`;
    }
  }
  return null;
}

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const svc = createServiceClient();
  const { data, error: dbErr } = await svc
    .from('campaign_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (dbErr) {
    console.error('[admin/campaign-codes] list:', dbErr.message);
    const missing =
      /campaign_codes/i.test(dbErr.message) &&
      /schema cache|does not exist|Could not find/i.test(dbErr.message);
    return NextResponse.json(
      {
        error: missing
          ? 'Database migration 060 not applied yet. Run supabase/migrations/060_campaign_codes_and_rewards.sql in the Supabase SQL Editor, then refresh.'
          : 'Failed to load codes',
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ codes: data ?? [] });
}

export async function POST(request: Request) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }

  const input = parsed.data;
  if (input.kind === 'sponsorship' && !input.partner_name?.trim()) {
    return NextResponse.json({ error: 'partner_name is required for sponsorship codes' }, { status: 400 });
  }
  const pricingError = validateCampaignPricing(input);
  if (pricingError) {
    return NextResponse.json({ error: pricingError }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data, error: dbErr } = await svc
    .from('campaign_codes')
    .insert({
      code: normalizeCampaignCode(input.code),
      kind: input.kind,
      label: input.label.trim(),
      partner_name: input.partner_name?.trim() || null,
      notes: input.notes?.trim() || null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      applies_to_plans: input.applies_to_plans,
      max_redemptions: input.max_redemptions ?? null,
      starts_at: input.starts_at ?? null,
      expires_at: input.expires_at ?? null,
      is_active: input.is_active,
      created_by: admin!.id,
    })
    .select('*')
    .single();

  if (dbErr) {
    console.error('[admin/campaign-codes] create:', dbErr.message);
    const conflict = dbErr.code === '23505';
    return NextResponse.json(
      { error: conflict ? 'Code already exists' : 'Failed to create code' },
      { status: conflict ? 409 : 500 },
    );
  }

  const { error: auditErr } = await svc.from('product_events').insert({
    event_name: 'campaign_created',
    user_id: admin!.id,
    props: {
      campaign_code_id: data.id,
      code: data.code,
      applies_to_plans: data.applies_to_plans,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
    },
  });
  if (auditErr) {
    console.error('[admin/campaign-codes] create audit:', auditErr.message);
  }

  return NextResponse.json({ code: data }, { status: 201 });
}

export const runtime = 'nodejs';
