/**
 * GET/PATCH /api/admin/reward-settings — global referral credit amounts.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const svc = createServiceClient();
  const { data, error: dbErr } = await svc
    .from('platform_reward_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (dbErr) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }

  return NextResponse.json({
    settings: data ?? { referrer_credits: 1, referred_credits: 1, trigger: 'first_completed_interview' },
  });
}

const patchSchema = z.object({
  referrer_credits: z.number().int().min(0).max(100),
  referred_credits: z.number().int().min(0).max(100),
});

export async function PATCH(request: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

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
  const { data, error: dbErr } = await svc
    .from('platform_reward_settings')
    .upsert({
      id: 1,
      referrer_credits: parsed.data.referrer_credits,
      referred_credits: parsed.data.referred_credits,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (dbErr) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export const runtime = 'nodejs';
