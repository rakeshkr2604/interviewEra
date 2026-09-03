/**
 * GET/POST /api/admin/pricing-campaigns — list / create global pricing campaigns.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import {
  deriveEffectiveStatus,
  findOverlappingActiveCampaign,
  generateCampaignSlug,
  logCampaignAudit,
  validatePricingCampaignInput,
} from '@/lib/pricing/pricing-campaign-admin';
import type { CampaignStatus } from '@/lib/pricing/effective-price';

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
  status: z.enum(['draft', 'scheduled', 'active']).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status')?.toLowerCase() || 'all';

  const svc = createServiceClient();
  let query = svc
    .from('pricing_campaigns')
    .select(
      'id, name, slug, status, is_active, discount_type, discount_value, applies_to_plans, starts_at, ends_at, display_label, display_badge, parent_campaign_id, archived_at, created_at, updated_at',
    )
    .order('starts_at', { ascending: false })
    .limit(200);

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error: dbErr } = await query;

  if (dbErr) {
    console.error('[admin/pricing-campaigns] list:', dbErr.message);
    const missing =
      /pricing_campaigns/i.test(dbErr.message) &&
      /schema cache|does not exist|Could not find/i.test(dbErr.message);
    return NextResponse.json(
      {
        error: missing
          ? 'Database migration 104 not applied yet. Run supabase/migrations/104_standardize_campaign_operations.sql in the Supabase SQL Editor, then refresh.'
          : 'Failed to load campaigns',
      },
      { status: missing ? 503 : 500 },
    );
  }

  const campaigns = data ?? [];
  const campaignIds = campaigns.map((c) => c.id);

  // Fetch aggregate performance metrics for all returned campaigns in one query
  const performanceMap: Record<
    string,
    { checkouts_count: number; paid_orders_count: number; gross_revenue_paise: number }
  > = {};

  if (campaignIds.length > 0) {
    const { data: paymentsData, error: paymentsErr } = await svc
      .from('payments')
      .select('pricing_campaign_id, status, amount')
      .in('pricing_campaign_id', campaignIds);

    if (!paymentsErr && paymentsData) {
      for (const p of paymentsData) {
        if (!p.pricing_campaign_id) continue;
        const entry = performanceMap[p.pricing_campaign_id] ?? {
          checkouts_count: 0,
          paid_orders_count: 0,
          gross_revenue_paise: 0,
        };
        entry.checkouts_count += 1;
        if (p.status === 'paid') {
          entry.paid_orders_count += 1;
          entry.gross_revenue_paise += Number(p.amount ?? 0);
        }
        performanceMap[p.pricing_campaign_id] = entry;
      }
    }
  }

  const enrichedCampaigns = campaigns.map((c) => {
    const effectiveStatus = deriveEffectiveStatus(c);
    const perf = performanceMap[c.id] ?? {
      checkouts_count: 0,
      paid_orders_count: 0,
      gross_revenue_paise: 0,
    };
    return {
      ...c,
      status: effectiveStatus,
      performance: perf,
    };
  });

  return NextResponse.json({ campaigns: enrichedCampaigns });
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

  // Derive initial status and active flag
  let determinedStatus: CampaignStatus = input.status ?? 'draft';
  let isActive = input.is_active ?? false;

  const now = Date.now();
  const startsAtMs = Date.parse(input.starts_at);
  const endsAtMs = Date.parse(input.ends_at);

  if (input.status === 'active' || input.is_active === true) {
    isActive = true;
    if (startsAtMs <= now && now < endsAtMs) {
      determinedStatus = 'active';
    } else if (now < startsAtMs) {
      determinedStatus = 'scheduled';
    }
  }

  const svc = createServiceClient();

  // Enforce plan-aware overlap validation only when activating or scheduling
  if (isActive && (determinedStatus === 'active' || determinedStatus === 'scheduled')) {
    try {
      const overlap = await findOverlappingActiveCampaign(svc, input);
      if (overlap) {
        const plansStr = overlap.applies_to_plans.length > 0
          ? overlap.applies_to_plans.join(', ')
          : 'all plans';
        return NextResponse.json(
          {
            error: `Another active campaign overlaps this window: "${overlap.name}" on plan(s): ${plansStr}.`,
            conflict: {
              id: overlap.id,
              name: overlap.name,
              starts_at: overlap.starts_at,
              ends_at: overlap.ends_at,
              plans: overlap.applies_to_plans,
            },
          },
          { status: 409 },
        );
      }
    } catch (overlapErr) {
      console.error('[admin/pricing-campaigns] overlap check failed:', overlapErr);
      return NextResponse.json({ error: 'Failed to validate campaign window' }, { status: 500 });
    }
  }

  // Generate slug safely (with unique discriminator to allow duplicate display names)
  const slug = input.slug || generateCampaignSlug(input.name);

  const { data, error: dbErr } = await svc
    .from('pricing_campaigns')
    .insert({
      name: input.name,
      slug,
      status: determinedStatus,
      is_active: isActive,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      applies_to_plans: input.applies_to_plans,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      display_label: input.display_label?.trim() || null,
      display_badge: input.display_badge?.trim() || null,
      created_by: admin!.id,
    })
    .select('*')
    .single();

  if (dbErr) {
    console.error('[admin/pricing-campaigns] create error:', dbErr.message);
    const conflict = dbErr.code === '23505';
    return NextResponse.json(
      { error: conflict ? 'A campaign with this slug already exists' : dbErr.message },
      { status: conflict ? 409 : 500 },
    );
  }

  // Audit log
  await logCampaignAudit(svc, {
    campaignId: data.id,
    adminId: admin!.id,
    action: 'created',
    details: {
      name: data.name,
      status: data.status,
      is_active: data.is_active,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      applies_to_plans: data.applies_to_plans,
    },
  });

  return NextResponse.json({ campaign: data }, { status: 201 });
}

export const runtime = 'nodejs';
