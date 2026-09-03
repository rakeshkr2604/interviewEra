/**
 * POST /api/admin/pricing-campaigns/[id]/operations
 *
 * Dedicated atomic lifecycle transitions:
 *   - activate: Start/schedule campaign immediately with overlap check and idempotent handling
 *   - pause: Temporarily deactivate without deleting or losing dates
 *   - resume: Reactivate paused campaign with overlap check
 *   - end: Conclude campaign immediately (sets ends_at = NOW)
 *   - extend: Extend ends_at to a future date with overlap check (same UUID)
 *   - continue: Create a fresh campaign instance preserving parent history (new UUID)
 *   - duplicate: Copy configuration into a new DRAFT campaign (new UUID)
 *   - archive: Hide from operational views while preserving financial history
 *   - restore: Unarchive back to DRAFT (never auto-activates)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { parseAppliesToPlans } from '@/lib/pricing/effective-price';
import {
  findOverlappingActiveCampaign,
  generateCampaignSlug,
  logCampaignAudit,
} from '@/lib/pricing/pricing-campaign-admin';

const operationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('activate'),
    activate_now: z.boolean().optional(),
  }),
  z.object({ action: z.literal('pause') }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('end') }),
  z.object({
    action: z.literal('extend'),
    new_ends_at: z.string().datetime(),
  }),
  z.object({
    action: z.literal('continue'),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    name: z.string().trim().min(1).max(120).optional(),
  }),
  z.object({
    action: z.literal('duplicate'),
    name: z.string().trim().min(1).max(120).optional(),
  }),
  z.object({ action: z.literal('archive') }),
  z.object({ action: z.literal('restore') }),
]);

export async function POST(
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

  const parsed = operationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid operation parameters' },
      { status: 400 },
    );
  }

  const op = parsed.data;
  const svc = createServiceClient();

  // Load the target campaign
  const { data: campaign, error: loadErr } = await svc
    .from('pricing_campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (loadErr) {
    console.error('[pricing-campaigns/operations] load error:', loadErr.message);
    return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 });
  }
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const plans = parseAppliesToPlans(campaign.applies_to_plans);

  // ── ACTIVATE / RESUME ───────────────────────────────────────────────────────
  if (op.action === 'activate' || op.action === 'resume') {
    // Idempotency: if already active and live, return current state smoothly
    if (campaign.status === 'active' && campaign.is_active) {
      return NextResponse.json({ campaign, already_active: true });
    }

    if (campaign.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot activate an archived campaign directly. Restore to draft first.' },
        { status: 400 },
      );
    }

    if (new Date(campaign.ends_at).getTime() <= now.getTime()) {
      return NextResponse.json(
        {
          error:
            'Cannot activate an ended campaign. Use "Extend" to set a future end date, or "Continue" to create a new instance.',
        },
        { status: 400 },
      );
    }

    // Determine target start time:
    // If admin explicitly requested "activate_now" (or action is resume), move starts_at to NOW if in the future
    let effectiveStartsAt = campaign.starts_at;
    const startMs = new Date(campaign.starts_at).getTime();
    if (op.action === 'resume' || op.activate_now || startMs <= now.getTime()) {
      if (startMs > now.getTime()) {
        effectiveStartsAt = nowIso;
      }
    }

    // Check plan-aware overlap against other active/scheduled campaigns
    const overlap = await findOverlappingActiveCampaign(
      svc,
      {
        starts_at: effectiveStartsAt,
        ends_at: campaign.ends_at,
        applies_to_plans: plans,
      },
      campaign.id,
    );
    if (overlap) {
      const plansStr = overlap.applies_to_plans.length > 0
        ? overlap.applies_to_plans.join(', ')
        : 'all plans';
      return NextResponse.json(
        {
          error: `Cannot activate: Another active campaign ("${overlap.name}") overlaps this window on plan(s): ${plansStr}.`,
        },
        { status: 409 },
      );
    }

    const newStatus = new Date(effectiveStartsAt).getTime() <= now.getTime() ? 'active' : 'scheduled';

    const { data: updated, error: updateErr } = await svc
      .from('pricing_campaigns')
      .update({
        status: newStatus,
        is_active: true,
        starts_at: effectiveStartsAt,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logCampaignAudit(svc, {
      campaignId: id,
      campaignName: campaign.name,
      adminId: admin!.id,
      action: op.action === 'resume' ? 'resumed' : 'activated',
      details: {
        previous_status: campaign.status,
        new_status: newStatus,
        starts_at: effectiveStartsAt,
        ends_at: campaign.ends_at,
      },
    });

    return NextResponse.json({ campaign: updated });
  }

  // ── PAUSE ───────────────────────────────────────────────────────────────────
  if (op.action === 'pause') {
    // Idempotency: if already paused, return success
    if (campaign.status === 'paused' && !campaign.is_active) {
      return NextResponse.json({ campaign, already_paused: true });
    }

    if (campaign.status === 'ended' || campaign.status === 'archived' || campaign.status === 'draft') {
      return NextResponse.json(
        { error: `Cannot pause a campaign in "${campaign.status}" state. Only active or scheduled campaigns can be paused.` },
        { status: 400 },
      );
    }

    const { data: updated, error: updateErr } = await svc
      .from('pricing_campaigns')
      .update({
        status: 'paused',
        is_active: false,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logCampaignAudit(svc, {
      campaignId: id,
      campaignName: campaign.name,
      adminId: admin!.id,
      action: 'paused',
      details: { previous_status: campaign.status },
    });

    return NextResponse.json({ campaign: updated });
  }

  // ── END NOW ─────────────────────────────────────────────────────────────────
  if (op.action === 'end') {
    // Idempotency: if already ended, return success
    if (campaign.status === 'ended' && !campaign.is_active) {
      return NextResponse.json({ campaign, already_ended: true });
    }

    if (campaign.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot end an archived campaign.' },
        { status: 400 },
      );
    }

    const { data: updated, error: updateErr } = await svc
      .from('pricing_campaigns')
      .update({
        status: 'ended',
        is_active: false,
        ends_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logCampaignAudit(svc, {
      campaignId: id,
      campaignName: campaign.name,
      adminId: admin!.id,
      action: 'ended',
      details: {
        previous_status: campaign.status,
        previous_ends_at: campaign.ends_at,
        ended_at: nowIso,
      },
    });

    return NextResponse.json({ campaign: updated });
  }

  // ── EXTEND WINDOW ───────────────────────────────────────────────────────────
  if (op.action === 'extend') {
    if (campaign.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot extend an archived campaign. Restore to draft or continue as a new instance.' },
        { status: 400 },
      );
    }

    const newEndsMs = new Date(op.new_ends_at).getTime();
    const startsMs = new Date(campaign.starts_at).getTime();

    if (newEndsMs <= startsMs) {
      return NextResponse.json(
        { error: 'New end date must be after the campaign start date.' },
        { status: 400 },
      );
    }
    if (newEndsMs <= now.getTime()) {
      return NextResponse.json(
        { error: 'New end date must be in the future.' },
        { status: 400 },
      );
    }

    // Check plan-aware overlap for the extended window
    const overlap = await findOverlappingActiveCampaign(
      svc,
      {
        starts_at: campaign.starts_at,
        ends_at: op.new_ends_at,
        applies_to_plans: plans,
      },
      campaign.id,
    );
    if (overlap) {
      const plansStr = overlap.applies_to_plans.length > 0
        ? overlap.applies_to_plans.join(', ')
        : 'all plans';
      return NextResponse.json(
        {
          error: `Cannot extend window: Overlaps with existing active campaign ("${overlap.name}") on plan(s): ${plansStr}.`,
        },
        { status: 409 },
      );
    }

    // If campaign was ended and new window covers now, reactivate it cleanly
    const shouldReactivate = startsMs <= now.getTime() && now.getTime() < newEndsMs;
    const newStatus = shouldReactivate ? 'active' : campaign.status === 'scheduled' ? 'scheduled' : campaign.status;
    const newIsActive = shouldReactivate ? true : campaign.is_active;

    const { data: updated, error: updateErr } = await svc
      .from('pricing_campaigns')
      .update({
        ends_at: op.new_ends_at,
        status: newStatus,
        is_active: newIsActive,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logCampaignAudit(svc, {
      campaignId: id,
      campaignName: campaign.name,
      adminId: admin!.id,
      action: 'extended',
      details: {
        old_ends_at: campaign.ends_at,
        new_ends_at: op.new_ends_at,
        reactivated: shouldReactivate,
      },
    });

    return NextResponse.json({ campaign: updated });
  }

  // ── CONTINUE / RESTART (NEW INSTANCE) ───────────────────────────────────────
  if (op.action === 'continue') {
    const startsMs = new Date(op.starts_at).getTime();
    const endsMs = new Date(op.ends_at).getTime();

    if (startsMs >= endsMs) {
      return NextResponse.json(
        { error: 'Campaign end time must be after start time.' },
        { status: 400 },
      );
    }
    if (endsMs <= now.getTime()) {
      return NextResponse.json(
        { error: 'Campaign end time must be in the future.' },
        { status: 400 },
      );
    }

    const instancePlans = parseAppliesToPlans(campaign.applies_to_plans);
    const instanceName = op.name?.trim() || campaign.name;

    // Check overlap for the new window
    const overlap = await findOverlappingActiveCampaign(svc, {
      starts_at: op.starts_at,
      ends_at: op.ends_at,
      applies_to_plans: instancePlans,
    });
    if (overlap) {
      const plansStr = overlap.applies_to_plans.length > 0
        ? overlap.applies_to_plans.join(', ')
        : 'all plans';
      return NextResponse.json(
        {
          error: `Cannot start new instance: Window overlaps with active campaign ("${overlap.name}") on plan(s): ${plansStr}.`,
        },
        { status: 409 },
      );
    }

    const instanceStatus = startsMs <= now.getTime() ? 'active' : 'scheduled';

    const { data: newCampaign, error: createErr } = await svc
      .from('pricing_campaigns')
      .insert({
        name: instanceName,
        slug: generateCampaignSlug(instanceName),
        parent_campaign_id: campaign.id,
        status: instanceStatus,
        is_active: true,
        discount_type: campaign.discount_type,
        discount_value: campaign.discount_value,
        applies_to_plans: campaign.applies_to_plans,
        starts_at: op.starts_at,
        ends_at: op.ends_at,
        display_label: campaign.display_label,
        display_badge: campaign.display_badge,
        created_by: admin!.id,
      })
      .select('*')
      .single();

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    await logCampaignAudit(svc, {
      campaignId: newCampaign.id,
      campaignName: newCampaign.name,
      adminId: admin!.id,
      action: 'restarted',
      details: {
        parent_campaign_id: campaign.id,
        parent_campaign_name: campaign.name,
      },
    });

    return NextResponse.json({ campaign: newCampaign }, { status: 201 });
  }

  // ── DUPLICATE (DRAFT CLONE) ────────────────────────────────────────────────
  if (op.action === 'duplicate') {
    const cloneName = op.name?.trim() || `${campaign.name} (Copy)`;
    const defaultStart = nowIso;
    const defaultEnd = new Date(now.getTime() + 3 * 86400 * 1000).toISOString();

    const { data: duplicated, error: createErr } = await svc
      .from('pricing_campaigns')
      .insert({
        name: cloneName,
        slug: generateCampaignSlug(cloneName),
        status: 'draft',
        is_active: false,
        discount_type: campaign.discount_type,
        discount_value: campaign.discount_value,
        applies_to_plans: campaign.applies_to_plans,
        starts_at: defaultStart,
        ends_at: defaultEnd,
        display_label: campaign.display_label,
        display_badge: campaign.display_badge,
        created_by: admin!.id,
      })
      .select('*')
      .single();

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    await logCampaignAudit(svc, {
      campaignId: duplicated.id,
      campaignName: duplicated.name,
      adminId: admin!.id,
      action: 'duplicated',
      details: {
        source_campaign_id: campaign.id,
        source_campaign_name: campaign.name,
      },
    });

    return NextResponse.json({ campaign: duplicated }, { status: 201 });
  }

  // ── ARCHIVE ────────────────────────────────────────────────────────────────
  if (op.action === 'archive') {
    // Idempotency: if already archived, return success
    if (campaign.status === 'archived' && !campaign.is_active) {
      return NextResponse.json({ campaign, already_archived: true });
    }

    const { data: updated, error: updateErr } = await svc
      .from('pricing_campaigns')
      .update({
        status: 'archived',
        is_active: false,
        archived_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logCampaignAudit(svc, {
      campaignId: id,
      campaignName: campaign.name,
      adminId: admin!.id,
      action: 'archived',
      details: { previous_status: campaign.status },
    });

    return NextResponse.json({ campaign: updated });
  }

  // ── RESTORE ────────────────────────────────────────────────────────────────
  if (op.action === 'restore') {
    if (campaign.status !== 'archived') {
      return NextResponse.json(
        { error: `Cannot restore a campaign with status "${campaign.status}". Only archived campaigns can be restored.` },
        { status: 400 },
      );
    }

    // Always restore strictly to DRAFT to prevent accidental live activation
    const { data: updated, error: updateErr } = await svc
      .from('pricing_campaigns')
      .update({
        status: 'draft',
        is_active: false,
        archived_at: null,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await logCampaignAudit(svc, {
      campaignId: id,
      campaignName: campaign.name,
      adminId: admin!.id,
      action: 'updated',
      details: { previous_status: 'archived', new_status: 'draft', restored: true },
    });

    return NextResponse.json({ campaign: updated });
  }

  return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
}

export const runtime = 'nodejs';
