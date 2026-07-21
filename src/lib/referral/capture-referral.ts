/**
 * Referral capture — persist pending referral when a referred user signs up.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeEmailForReferralCompare } from '@/lib/referral/apply-referral';

export async function captureReferralFromCode(
  serviceClient: SupabaseClient,
  referredUserId: string,
  referralCode: string,
): Promise<{ captured: boolean; reason?: string }> {
  const code = referralCode.trim();
  if (!code) return { captured: false, reason: 'empty_code' };

  const { data: referrer } = await serviceClient
    .from('users')
    .select('id, email')
    .eq('referral_code', code)
    .maybeSingle();

  if (!referrer) return { captured: false, reason: 'invalid_code' };
  if (referrer.id === referredUserId) return { captured: false, reason: 'self_referral' };

  const { data: referred } = await serviceClient
    .from('users')
    .select('email')
    .eq('id', referredUserId)
    .maybeSingle();

  if (
    referrer.email &&
    referred?.email &&
    normalizeEmailForReferralCompare(referrer.email) ===
      normalizeEmailForReferralCompare(referred.email)
  ) {
    return { captured: false, reason: 'self_referral' };
  }

  const { data: existing } = await serviceClient
    .from('referrals')
    .select('id, status')
    .eq('referred_id', referredUserId)
    .maybeSingle();

  if (existing) {
    return { captured: existing.status === 'pending', reason: 'already_exists' };
  }

  const { error } = await serviceClient.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    status: 'pending',
  });

  if (error) {
    console.warn('[referral/capture] insert failed:', error.message);
    return { captured: false, reason: 'insert_failed' };
  }

  return { captured: true };
}
