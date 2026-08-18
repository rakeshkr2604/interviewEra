/**
 * PATCH /api/admin/pricing-campaigns/[id] — update / activate / deactivate.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { parseAppliesToPlans } from '@/lib/pricing/effective-price';
import {
  findOverlappingActiveCampaign,
  slugifyCampaignName,
  validatePricingCampaignInput,
} from '@/lib/pricing/pricing-campaign-admin';
import type { PaidPlanId } from '@/lib/pricing/plans';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional(),
  discount_type: z.enum(['percent', 'flat_paise']).optional(),
  discount_value: z.number().int().nonnegative().optional(),
  applies_to_plans: z.array(z.enum(['starter', 'pro'])).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  display_label: z.string().trim().max(120).optional().nullable(),
  display_badge: z.string().trim().max(80).optional().nullable(),
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
    .from('pricing_campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (currentErr) {
    console.error('[admin/pricing-campaigns] current:', currentErr.message);
    return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const candidate = {
    name: parsed.data.name ?? String(current.name),
    slug: parsed.data.slug ?? String(current.slug),
    discount_type: parsed.data.discount_type ?? (current.discount_type as 'percent' | 'flat_paise'),
    discount_value: parsed.data.discount_value ?? Number(current.discount_value),
    applies_to_plans: parsed.data.applies_to_plans ?? parseAppliesToPlans(current.applies_to_plans),
    starts_at: parsed.data.starts_at ?? String(current.starts_at),
    ends_at: parsed.data.ends_at ?? String(current.ends_at),
    is_active: parsed.data.is_active ?? Boolean(current.is_active),
  };

  const pricingError = validatePricingCampaignInput({
    discount_type: candidate.discount_type,
    discount_value: candidate.discount_value,
    applies_to_plans: candidate.applies_to_plans as PaidPlanId[],
    starts_at: candidate.starts_at,
    ends_at: candidate.ends_at,
  });
  if (pricingError) {
    return NextResponse.json({ error: pricingError }, { status: 400 });
  }

  if (candidate.is_active) {
    try {
      const overlap = await findOverlappingActiveCampaign(
        svc,
        { starts_at: candidate.starts_at, ends_at: candidate.ends_at },
        id,
      );
      if (overlap) {
        return NextResponse.json(
          { error: `Another active campaign overlaps this window: ${overlap.name}.` },
          { status: 409 },
        );
      }
    } catch (overlapErr) {
      console.error('[admin/pricing-campaigns] overlap:', overlapErr);
      return NextResponse.json({ error: 'Failed to validate campaign window' }, { status: 500 });
    }
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.name && !parsed.data.slug && !current.slug) {
    updates.slug = slugifyCampaignName(parsed.data.name);
  }

  const { data, error: dbErr } = await svc
    .from('pricing_campaigns')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (dbErr) {
    console.error('[admin/pricing-campaigns] patch:', dbErr.message);
    const conflict = dbErr.code === '23505';
    return NextResponse.json(
      { error: conflict ? 'A campaign with this slug already exists' : 'Failed to update campaign' },
      { status: conflict ? 409 : 500 },
    );
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error: auditErr } = await svc.from('product_events').insert({
    event_name: 'pricing_campaign_updated',
    user_id: admin!.id,
    props: {
      pricing_campaign_id: data.id,
      changed_fields: Object.keys(parsed.data),
      is_active: data.is_active,
    },
  });
  if (auditErr) {
    console.error('[admin/pricing-campaigns] update audit:', auditErr.message);
  }

  return NextResponse.json({ campaign: data });
}

export const runtime = 'nodejs';
