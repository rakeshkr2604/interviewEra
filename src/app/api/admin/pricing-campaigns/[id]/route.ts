/**
 * GET/PATCH/DELETE /api/admin/pricing-campaigns/[id]
 *
 * Single campaign inspection, edit, and safe deletion.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { parseAppliesToPlans } from '@/lib/pricing/effective-price';
import {
  canDeleteCampaign,
  deriveEffectiveStatus,
  findOverlappingActiveCampaign,
  generateCampaignSlug,
  logCampaignAudit,
  validatePricingCampaignInput,
} from '@/lib/pricing/pricing-campaign-admin';
import type { CampaignStatus } from '@/lib/pricing/effective-price';
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
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'ended', 'archived']).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const svc = createServiceClient();
  const { data: campaign, error: dbErr } = await svc
    .from('pricing_campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (dbErr) {
    console.error('[admin/pricing-campaigns/[id]] get error:', dbErr.message);
    return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 });
  }
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch audit history
  const { data: audits } = await svc
    .from('campaign_audit_logs')
    .select('id, action, details, created_at, admin_id')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Fetch performance metrics
  const { data: payments } = await svc
    .from('payments')
    .select('id, status, amount, created_at')
    .eq('pricing_campaign_id', id);

  let checkoutsCount = 0;
  let paidOrdersCount = 0;
  let grossRevenuePaise = 0;

  for (const p of payments ?? []) {
    checkoutsCount += 1;
    if (p.status === 'paid') {
      paidOrdersCount += 1;
      grossRevenuePaise += Number(p.amount ?? 0);
    }
  }

  const effectiveStatus = deriveEffectiveStatus(campaign);

  return NextResponse.json({
    campaign: {
      ...campaign,
      status: effectiveStatus,
    },
    performance: {
      checkouts_count: checkoutsCount,
      paid_orders_count: paidOrdersCount,
      gross_revenue_paise: grossRevenuePaise,
    },
    audit_logs: audits ?? [],
  });
}

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
    console.error('[admin/pricing-campaigns/[id]] patch fetch:', currentErr.message);
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
    status: (parsed.data.status ?? current.status) as CampaignStatus,
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

  // Plan-aware overlap check if the campaign is or will be active/scheduled
  if (candidate.is_active && (candidate.status === 'active' || candidate.status === 'scheduled')) {
    try {
      const overlap = await findOverlappingActiveCampaign(
        svc,
        {
          starts_at: candidate.starts_at,
          ends_at: candidate.ends_at,
          applies_to_plans: candidate.applies_to_plans as PaidPlanId[],
        },
        id,
      );
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
      console.error('[admin/pricing-campaigns/[id]] overlap check failed:', overlapErr);
      return NextResponse.json({ error: 'Failed to validate campaign window' }, { status: 500 });
    }
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.name && !parsed.data.slug && !current.slug) {
    updates.slug = generateCampaignSlug(parsed.data.name);
  }

  const { data, error: dbErr } = await svc
    .from('pricing_campaigns')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (dbErr) {
    console.error('[admin/pricing-campaigns/[id]] update error:', dbErr.message);
    const conflict = dbErr.code === '23505';
    return NextResponse.json(
      { error: conflict ? 'A campaign with this slug already exists' : dbErr.message },
      { status: conflict ? 409 : 500 },
    );
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await logCampaignAudit(svc, {
    campaignId: data.id,
    adminId: admin!.id,
    action: 'updated',
    details: {
      changed_fields: Object.keys(parsed.data),
      is_active: data.is_active,
      status: data.status,
    },
  });

  return NextResponse.json({ campaign: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const svc = createServiceClient();

  // 1. Guard against deleting campaigns with financial/transactional history
  try {
    const deleteCheck = await canDeleteCampaign(svc, id);
    if (!deleteCheck.canDelete) {
      return NextResponse.json(
        {
          error: deleteCheck.reason,
          paymentCount: deleteCheck.paymentCount,
          suggestedAction: 'archive',
        },
        { status: 409 },
      );
    }
  } catch (checkErr) {
    console.error('[admin/pricing-campaigns/[id]] delete check error:', checkErr);
    return NextResponse.json({ error: 'Failed to verify campaign deletion safety' }, { status: 500 });
  }

  // 2. Fetch campaign details for audit trail before deleting
  const { data: campaign } = await svc
    .from('pricing_campaigns')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  // 3. Perform hard deletion
  const { error: delErr } = await svc.from('pricing_campaigns').delete().eq('id', id);
  if (delErr) {
    console.error('[admin/pricing-campaigns/[id]] delete error:', delErr.message);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }

  // Record audit in product_events
  await logCampaignAudit(svc, {
    campaignId: id,
    adminId: admin!.id,
    action: 'deleted',
    details: {
      deleted_campaign_name: campaign?.name ?? 'unknown',
    },
  });

  return NextResponse.json({ success: true, deletedId: id });
}

export const runtime = 'nodejs';
