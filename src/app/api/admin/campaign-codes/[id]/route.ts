/**
 * PATCH /api/admin/campaign-codes/[id] — update / deactivate a campaign code.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

const patchSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  partner_name: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  discount_type: z.enum(['percent', 'flat_paise']).optional(),
  discount_value: z.number().int().positive().optional(),
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
  const { error } = await requirePlatformAdmin();
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

  const updates = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  const svc = createServiceClient();
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

  return NextResponse.json({ code: data });
}

export const runtime = 'nodejs';
