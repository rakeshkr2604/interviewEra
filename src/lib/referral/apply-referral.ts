/**
 * Apply referral bonus after referred user's first completed interview.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { addCredit } from '@/lib/utils/credits';

export type ApplyReferralResult =
  | { credited: true }
  | { credited: false; reason: string };

export async function applyReferralBonus(
  serviceClient: SupabaseClient,
  referredUserId: string,
  referralCode?: string,
): Promise<ApplyReferralResult> {
  const code = referralCode?.trim();

  if (!code) {
    const { data: pending } = await serviceClient
      .from('referrals')
      .select('id, referrer_id, status')
      .eq('referred_id', referredUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!pending) {
      return { credited: false, reason: 'no_pending_referral' };
    }

    const now = new Date().toISOString();
    const { count: completedCount } = await serviceClient
      .from('interviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', referredUserId)
      .eq('status', 'completed');

    if (!completedCount || completedCount < 1) {
      return { credited: false, reason: 'no_completed_interview' };
    }

    const { data: creditedExisting } = await serviceClient
      .from('referrals')
      .select('id')
      .eq('referred_id', referredUserId)
      .eq('status', 'credited')
      .maybeSingle();

    if (creditedExisting) {
      return { credited: false, reason: 'already_credited' };
    }

    await serviceClient
      .from('referrals')
      .update({ status: 'credited', credited_at: now })
      .eq('id', pending.id);

    await addCredit(referredUserId, 1, `Referral bonus — referred by ${pending.referrer_id}`);
    await addCredit(pending.referrer_id as string, 1, `Referral bonus — friend ${referredUserId} completed first interview`);

    return { credited: true };
  }

  const { data: referrer } = await serviceClient
    .from('users')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle();

  if (!referrer) return { credited: false, reason: 'invalid_code' };
  if (referrer.id === referredUserId) return { credited: false, reason: 'self_referral' };

  const { data: existingReferral } = await serviceClient
    .from('referrals')
    .select('id, status')
    .eq('referred_id', referredUserId)
    .eq('status', 'credited')
    .maybeSingle();

  if (existingReferral) return { credited: false, reason: 'already_credited' };

  const { count: completedCount } = await serviceClient
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', referredUserId)
    .eq('status', 'completed');

  if (!completedCount || completedCount < 1) {
    return { credited: false, reason: 'no_completed_interview' };
  }

  const now = new Date().toISOString();
  const { data: pendingReferral } = await serviceClient
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', referredUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingReferral) {
    await serviceClient
      .from('referrals')
      .update({ status: 'credited', credited_at: now })
      .eq('id', pendingReferral.id);
  } else {
    await serviceClient.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: referredUserId,
      status: 'credited',
      credited_at: now,
    });
  }

  await addCredit(referredUserId, 1, `Referral bonus — referred by ${referrer.id}`);
  await addCredit(referrer.id, 1, `Referral bonus — friend ${referredUserId} completed first interview`);

  return { credited: true };
}
