/**
 * GET/POST /api/admin/pricing-campaigns — list / create global pricing campaigns.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import {
  findOverlappingActiveCampaign,
  slugifyCampaignName,
  validatePricingCampaignInput,
} from '@/lib/pricing/pricing-campaign-admin';

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional(),
  discount_type: z.enum(['percent', 'flat_paise']),
  discount_value: z.number().int().nonnegative(),
  applies_to_plans: z.array(z.enum(['starter', 'pro'])).optional().default([]),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  display_label: z.string().trim().max(120).optional().nullable(),
  display_badge: z.string().trim().max(80).optional().nullable(),
  is_active: z.boolean().optional().default(false),
});

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const svc = createServiceClient();
  const { data, error: dbErr } = await svc
    .from('pricing_campaigns')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(100);

  if (dbErr) {
    console.error('[admin/pricing-campaigns] list:', dbErr.message);
    const missing =
      /pricing_campaigns/i.test(dbErr.message) &&
      /schema cache|does not exist|Could not find/i.test(dbErr.message);
    return NextResponse.json(
      {
        error: missing
          ? 'Database migration 095 not applied yet. Run supabase/migrations/095_pricing_campaigns.sql in the Supabase SQL Editor, then refresh.'
          : 'Failed to load campaigns',
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ campaigns: data ?? [] });
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
  const pricingError = validatePricingCampaignInput(input);
  if (pricingError) {
    return NextResponse.json({ error: pricingError }, { status: 400 });
  }

  const svc = createServiceClient();
  if (input.is_active) {
    try {
      const overlap = await findOverlappingActiveCampaign(svc, input);
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

  const { data, error: dbErr } = await svc
    .from('pricing_campaigns')
    .insert({
      name: input.name,
      slug: input.slug ?? slugifyCampaignName(input.name),
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      applies_to_plans: input.applies_to_plans,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      display_label: input.display_label?.trim() || null,
      display_badge: input.display_badge?.trim() || null,
      is_active: input.is_active,
      created_by: admin!.id,
    })
    .select('*')
    .single();

  if (dbErr) {
    console.error('[admin/pricing-campaigns] create:', dbErr.message);
    const conflict = dbErr.code === '23505';
    return NextResponse.json(
      { error: conflict ? 'A campaign with this slug already exists' : 'Failed to create campaign' },
      { status: conflict ? 409 : 500 },
    );
  }

  const { error: auditErr } = await svc.from('product_events').insert({
    event_name: 'pricing_campaign_created',
    user_id: admin!.id,
    props: {
      pricing_campaign_id: data.id,
      name: data.name,
      is_active: data.is_active,
      applies_to_plans: data.applies_to_plans,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
    },
  });
  if (auditErr) {
    console.error('[admin/pricing-campaigns] create audit:', auditErr.message);
  }

  return NextResponse.json({ campaign: data }, { status: 201 });
}

export const runtime = 'nodejs';
