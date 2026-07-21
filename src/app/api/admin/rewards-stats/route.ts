/**
 * GET /api/admin/rewards-stats — at-a-glance Rewards dashboard metrics.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const svc = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();

  const [
    { count: activeCodes },
    { count: creditedRefs },
    { data: settings },
    { count: redemptionsWeek },
    { data: adminGrants },
  ] = await Promise.all([
    svc
      .from('campaign_codes')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    svc
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'credited'),
    svc
      .from('platform_reward_settings')
      .select('referrer_credits, referred_credits')
      .eq('id', 1)
      .maybeSingle(),
    svc
      .from('campaign_code_redemptions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
      .in('status', ['reserved', 'consumed']),
    svc
      .from('credit_transactions')
      .select('amount')
      .eq('type', 'credit')
      .like('reason', 'admin_grant:%'),
  ]);

  const referrer = Number(settings?.referrer_credits) || 1;
  const referred = Number(settings?.referred_credits) || 1;
  const referralCreditsGranted = (creditedRefs ?? 0) * (referrer + referred);
  const manualCreditsGranted = (adminGrants ?? []).reduce(
    (s, r) => s + (Number(r.amount) || 0),
    0,
  );

  return NextResponse.json({
    active_codes: activeCodes ?? 0,
    referral_credits_granted: referralCreditsGranted,
    manual_credits_granted: manualCreditsGranted,
    redemptions_this_week: redemptionsWeek ?? 0,
  });
}

export const runtime = 'nodejs';
