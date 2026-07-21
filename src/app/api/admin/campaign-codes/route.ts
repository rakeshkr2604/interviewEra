/**
 * GET/POST /api/admin/campaign-codes — list / create campaign codes.
 * PATCH via /api/admin/campaign-codes/[id]
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { normalizeCampaignCode } from '@/lib/campaign-codes';

const createSchema = z.object({
  code: z.string().min(2).max(64),
  kind: z.enum(['promo', 'sponsorship']),
  label: z.string().min(1).max(120),
  partner_name: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  discount_type: z.enum(['percent', 'flat_paise']),
  discount_value: z.number().int().positive(),
  applies_to_plans: z.array(z.enum(['starter', 'pro'])).optional().default([]),
  max_redemptions: z.number().int().positive().optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

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
  if (input.discount_type === 'percent' && (input.discount_value < 1 || input.discount_value > 99)) {
    return NextResponse.json({ error: 'Percent discount must be 1–99' }, { status: 400 });
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

  return NextResponse.json({ code: data }, { status: 201 });
}

export const runtime = 'nodejs';
