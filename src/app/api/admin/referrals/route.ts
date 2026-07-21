/**
 * GET /api/admin/referrals — paginated referral activity for founder triage.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const status = url.searchParams.get('status'); // pending | credited | all
  const offset = (page - 1) * limit;

  const svc = createServiceClient();

  let query = svc
    .from('referrals')
    .select('id, referrer_id, referred_id, status, credited_at', { count: 'exact' })
    .order('credited_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (status === 'pending' || status === 'credited') {
    query = query.eq('status', status);
  }

  const { data: rows, count, error: dbErr } = await query;
  if (dbErr) {
    console.error('[admin/referrals]', dbErr.message);
    return NextResponse.json({ error: 'Failed to load referrals' }, { status: 500 });
  }

  const userIds = [
    ...new Set(
      (rows ?? []).flatMap((r) => [r.referrer_id as string, r.referred_id as string]),
    ),
  ];

  const emailMap = new Map<string, string>();
  const referralCodeMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await svc
      .from('users')
      .select('id, email, referral_code')
      .in('id', userIds);
    for (const u of users ?? []) {
      emailMap.set(u.id, u.email);
      if (u.referral_code) referralCodeMap.set(u.id, u.referral_code as string);
    }
  }

  const { data: settings } = await svc
    .from('platform_reward_settings')
    .select('referrer_credits, referred_credits')
    .eq('id', 1)
    .maybeSingle();

  const referrerCredits = settings?.referrer_credits ?? 1;
  const referredCredits = settings?.referred_credits ?? 1;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://interviewera.com').replace(/\/$/, '');

  const referrals = (rows ?? []).map((r) => {
    const referrerCode = referralCodeMap.get(r.referrer_id as string) ?? null;
    return {
      id: r.id,
      status: r.status,
      credited_at: r.credited_at,
      referrer_id: r.referrer_id,
      referred_id: r.referred_id,
      referrer_email: emailMap.get(r.referrer_id as string) ?? null,
      referred_email: emailMap.get(r.referred_id as string) ?? null,
      referrer_code: referrerCode,
      referrer_share_url: referrerCode ? `${appUrl}/join?ref=${referrerCode}` : null,
      credits_granted:
        r.status === 'credited' ? referrerCredits + referredCredits : 0,
    };
  });

  return NextResponse.json({
    referrals,
    total: count ?? 0,
    page,
    limit,
    total_pages: Math.ceil((count ?? 0) / limit),
    settings: { referrer_credits: referrerCredits, referred_credits: referredCredits },
  });
}

export const runtime = 'nodejs';
