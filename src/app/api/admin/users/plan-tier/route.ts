/**
 * POST /api/admin/users/plan-tier — manually change a user's plan tier by email.
 *
 * Mirrors the self-serve Razorpay activation (`activate-plan.ts`) for
 * starter/pro: extends from the current expiry when still active, otherwise
 * starts fresh from now, and grants that plan's credit allotment via the
 * audited `add_credit` RPC (same reason convention as the manual credit
 * grant tool, so it rolls into the existing "Manual credits granted" stat
 * and usage log).
 *
 * Does NOT touch last_payment_id / last_order_id — those are the Razorpay
 * idempotency keys and must stay payment-only so a real purchase can never
 * be mistaken for, or blocked by, a comp grant.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { addCredit } from '@/lib/utils/credits';
import { PAID_PLANS, computePlanExpiry, type PaidPlanId } from '@/lib/pricing/plans';

const WORKSPACE_MANAGED_TIERS = new Set(['campus', 'campus_admin']);

const schema = z
  .object({
    email: z.string().trim().toLowerCase().email().optional(),
    user_id: z.string().uuid().optional(),
    tier: z.enum(['free', 'starter', 'pro']),
    reason: z.string().trim().min(3).max(500),
  })
  .refine((v) => Boolean(v.email || v.user_id), { message: 'email or user_id required' });

type UsersRow = {
  id: string;
  email: string | null;
  plan_tier: string;
  plan_status: string | null;
  plan_expires_at: string | null;
  plan_started_at: string | null;
  credits_remaining: number | null;
};

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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid' },
      { status: 400 },
    );
  }

  const svc = createServiceClient();
  const { tier: targetTier, reason } = parsed.data;

  let userQuery = svc
    .from('users')
    .select('id, email, plan_tier, plan_status, plan_expires_at, plan_started_at, credits_remaining');
  userQuery = parsed.data.user_id
    ? userQuery.eq('id', parsed.data.user_id)
    : userQuery.eq('email', parsed.data.email!);

  const { data: user, error: lookupError } = await userQuery.maybeSingle<UsersRow>();

  if (lookupError) {
    console.error('[admin/users/plan-tier] user lookup failed:', lookupError);
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Campus seats are workspace-managed (org-level provisioning) — never let a
  // one-off admin grant silently strip or collide with that linkage.
  if (WORKSPACE_MANAGED_TIERS.has(user.plan_tier)) {
    return NextResponse.json(
      {
        error:
          'This user is on a campus/workspace plan. Change it from Campus org tools, not the manual credit tool.',
      },
      { status: 409 },
    );
  }

  if (targetTier === user.plan_tier && targetTier === 'free') {
    return NextResponse.json({
      ok: true,
      noop: true,
      user: {
        id: user.id,
        email: user.email,
        plan_tier: user.plan_tier,
        plan_expires_at: user.plan_expires_at,
        credits_remaining: user.credits_remaining,
      },
    });
  }

  const reasonSuffix = `${reason} (by ${admin!.email})`;

  if (targetTier === 'free') {
    // Manual revoke / correction — mirrors the plan-expiry cron's downgrade:
    // zero the paid credits so a mistaken upgrade can't be used then reverted
    // for a free top-up.
    const { error: updateError } = await svc
      .from('users')
      .update({
        plan_tier: 'free',
        plan_status: 'expired',
        plan_expires_at: null,
        credits_remaining: 0,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[admin/users/plan-tier] downgrade failed:', updateError);
      return NextResponse.json({ error: 'Failed to update plan tier' }, { status: 500 });
    }

    console.info('[admin/users/plan-tier] manual downgrade to free', {
      userId: user.id,
      previousTier: user.plan_tier,
      by: admin!.email,
      reason,
    });

    const { data: updated } = await svc
      .from('users')
      .select('id, email, plan_tier, plan_expires_at, credits_remaining')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({ ok: true, user: updated });
  }

  // starter | pro
  const planId = targetTier as PaidPlanId;
  const planConfig = PAID_PLANS[planId];
  const now = new Date();
  const currentExpires = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
  const isActivePaid =
    user.plan_status === 'active' && currentExpires !== null && currentExpires.getTime() > now.getTime();

  // Switching tiers mid-cycle (e.g. starter → pro) starts a fresh cycle at the
  // new tier's duration rather than inheriting the old tier's remaining days.
  const extendFrom = isActivePaid && user.plan_tier === targetTier ? currentExpires : null;
  const newExpiresAt = computePlanExpiry(extendFrom, planConfig.durationDays, now);
  const planStartedAt = extendFrom ? (user.plan_started_at ?? now.toISOString()) : now.toISOString();

  const { error: updateError } = await svc
    .from('users')
    .update({
      plan_tier: targetTier,
      plan_status: 'active',
      plan_expires_at: newExpiresAt.toISOString(),
      plan_started_at: planStartedAt,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('[admin/users/plan-tier] tier update failed:', updateError);
    return NextResponse.json({ error: 'Failed to update plan tier' }, { status: 500 });
  }

  let creditGrantFailed = false;
  try {
    await addCredit(
      user.id,
      planConfig.credits,
      `admin_grant: plan upgrade to ${planConfig.label} — ${reasonSuffix}`,
    );
  } catch (err) {
    creditGrantFailed = true;
    console.error('[admin/users/plan-tier] tier changed but credit grant failed:', {
      userId: user.id,
      targetTier,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  console.info('[admin/users/plan-tier] manual upgrade', {
    userId: user.id,
    previousTier: user.plan_tier,
    targetTier,
    creditsGranted: creditGrantFailed ? 0 : planConfig.credits,
    by: admin!.email,
    reason,
  });

  const { data: updated } = await svc
    .from('users')
    .select('id, email, plan_tier, plan_expires_at, credits_remaining')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    user: updated,
    creditsGranted: creditGrantFailed ? 0 : planConfig.credits,
    warning: creditGrantFailed
      ? 'Plan tier was updated, but the credit grant failed. Grant the credits manually.'
      : undefined,
  });
}

export const runtime = 'nodejs';
