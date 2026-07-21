/**
 * POST /api/admin/credits/grant — manually grant credits (audit via add_credit RPC).
 * v1: positive grants only.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { addCredit } from '@/lib/utils/credits';

const schema = z.object({
  email: z.string().email().optional(),
  user_id: z.string().uuid().optional(),
  amount: z.number().int().min(1).max(100),
  reason: z.string().min(3).max(500),
}).refine((v) => Boolean(v.email || v.user_id), {
  message: 'email or user_id required',
});

export async function POST(request: Request) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });
  }

  const svc = createServiceClient();
  let userId = parsed.data.user_id ?? null;

  if (!userId && parsed.data.email) {
    const { data: user } = await svc
      .from('users')
      .select('id, email, credits_remaining')
      .eq('email', parsed.data.email.trim().toLowerCase())
      .maybeSingle();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    userId = user.id;
  }

  if (!userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const reason = `admin_grant: ${parsed.data.reason.trim()} (by ${admin!.email})`;

  try {
    await addCredit(userId, parsed.data.amount, reason);
  } catch (err) {
    console.error('[admin/credits/grant]', err);
    return NextResponse.json({ error: 'Failed to grant credits' }, { status: 500 });
  }

  const { data: updated } = await svc
    .from('users')
    .select('id, email, credits_remaining')
    .eq('id', userId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    user: updated,
    amount: parsed.data.amount,
    reason,
  });
}

export const runtime = 'nodejs';
