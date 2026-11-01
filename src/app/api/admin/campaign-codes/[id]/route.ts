/**
 * PATCH /api/admin/campaign-codes/[id] — update / deactivate a campaign code.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { computeCampaignDiscountQuote } from '@/lib/campaign-codes';
import { getPaidPlan, type PaidPlanId } from '@/lib/pricing/plans';
import { launchActivationError } from '@/lib/pricing/launch-offer';

const patchSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  partner_name: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  discount_type: z.enum(['percent', 'flat_paise']).optional(),
  discount_value: z.number().int().nonnegative().optional(),
  applies_to_plans: z.array(z.enum(['starter', 'pro'])).optional(),
  max_redemptions: z.number().int().positive().optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data: current, error: currentErr } = await svc
    .from('campaign_codes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (currentErr) {
    console.error('[admin/campaign-codes] current:', currentErr.message);
    return NextResponse.json({ error: 'Failed to load code' }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const candidate = { ...current, ...parsed.data };
  if (
    candidate.starts_at &&
    candidate.expires_at &&
    String(candidate.starts_at) >= String(candidate.expires_at)
  ) {
    return NextResponse.json(
      { error: 'Campaign end must be after its start.' },
      { status: 400 },
    );
  }

  const activationError = launchActivationError(candidate);
  if (activationError) {
    return NextResponse.json({ error: activationError }, { status: 400 });
  }

  const plans: PaidPlanId[] =
    candidate.applies_to_plans.length > 0
      ? (candidate.applies_to_plans as PaidPlanId[])
      : ['starter', 'pro'];
  // Inactive codes cannot be charged, so pricing floors only gate codes that stay live.
  // This keeps legacy deep-discount codes deactivatable after floors are raised.
  for (const plan of candidate.is_active ? plans : []) {
    const config = getPaidPlan(plan);
    const quote = computeCampaignDiscountQuote({
      listAmountPaise: config.amountPaise,
      promoFloorPaise: config.promoFloorPaise,
      discountType: candidate.discount_type,
      discountValue: candidate.discount_value,
    });
    if (!quote.ok) {
      return NextResponse.json(
        {
          error:
            quote.error_code === 'CODE_DISCOUNT_INVALID'
              ? 'Discount must be between 0% and 50% and use integer-safe values.'
              : `${config.label} final price cannot be below ₹${config.promoFloorPaise / 100}.`,
        },
        { status: 400 },
      );
    }
  }

  const updates = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  const { data, error: dbErr } = await svc
    .from('campaign_codes')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (dbErr) {
    console.error('[admin/campaign-codes] patch:', dbErr.message);
    return NextResponse.json({ error: 'Failed to update code' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error: auditErr } = await svc.from('product_events').insert({
    event_name: 'campaign_updated',
    user_id: admin!.id,
    props: {
      campaign_code_id: data.id,
      code: data.code,
      changed_fields: Object.keys(parsed.data),
      applies_to_plans: data.applies_to_plans,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
    },
  });
  if (auditErr) {
    console.error('[admin/campaign-codes] update audit:', auditErr.message);
  }

  return NextResponse.json({ code: data });
}

export const runtime = 'nodejs';
