/**
 * Apply referral bonus after referred user's first completed interview.
 * Prefer atomic RPC apply_referral_bonus; fall back to legacy path if RPC missing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { addCredit } from '@/lib/utils/credits';

export type ApplyReferralResult =
  | { credited: true }
  | { credited: false; reason: string };

/** Gmail-style plus-address and case normalization for soft self-referral signal. */
export function normalizeEmailForReferralCompare(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0) return trimmed;
  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const plus = local.indexOf('+');
    if (plus >= 0) local = local.slice(0, plus);
    local = local.replace(/\./g, '');
    return `${local}@gmail.com`;
  }
  return trimmed;
}

export async function applyReferralBonus(
  serviceClient: SupabaseClient,
  referredUserId: string,
  referralCode?: string,
): Promise<ApplyReferralResult> {
  const code = referralCode?.trim();

  // Manual code path: ensure a pending/credited row exists, then use atomic RPC.
  if (code) {
    const prepared = await ensureReferralRowForCode(serviceClient, referredUserId, code);
    if (!prepared.ok) return { credited: false, reason: prepared.reason };
  }

  const { data, error } = await serviceClient.rpc('apply_referral_bonus', {
    p_referred_id: referredUserId,
  });

  if (!error) {
    const row = Array.isArray(data)
      ? (data[0] as { credited: boolean; reason: string | null } | undefined)
      : (data as { credited: boolean; reason: string | null } | null);
    if (row?.credited) return { credited: true };
    return { credited: false, reason: row?.reason ?? 'no_pending_referral' };
  }

  // RPC not deployed yet — legacy non-atomic path (pre-060).
  console.warn('[referral/apply] RPC unavailable, using legacy path:', error.message);
  return applyReferralBonusLegacy(serviceClient, referredUserId, code);
}

async function ensureReferralRowForCode(
  serviceClient: SupabaseClient,
  referredUserId: string,
  code: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: referrer } = await serviceClient
    .from('users')
    .select('id, email')
    .eq('referral_code', code)
    .maybeSingle();

  if (!referrer) return { ok: false, reason: 'invalid_code' };
  if (referrer.id === referredUserId) return { ok: false, reason: 'self_referral' };

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
    return { ok: false, reason: 'self_referral' };
  }

  const { data: existing } = await serviceClient
    .from('referrals')
    .select('id, status')
    .eq('referred_id', referredUserId)
    .maybeSingle();

  if (existing?.status === 'credited') return { ok: false, reason: 'already_credited' };
  if (existing) return { ok: true };

  const { error } = await serviceClient.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    status: 'pending',
  });

  if (error) {
    // Unique race — treat as ok if a row now exists
    const { data: again } = await serviceClient
      .from('referrals')
      .select('id')
      .eq('referred_id', referredUserId)
      .maybeSingle();
    if (again) return { ok: true };
    return { ok: false, reason: 'insert_failed' };
  }

  return { ok: true };
}

async function applyReferralBonusLegacy(
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

    const { data: updated } = await serviceClient
      .from('referrals')
      .update({ status: 'credited', credited_at: now })
      .eq('id', pending.id)
      .eq('status', 'pending')
      .select('id');

    if (!updated?.length) {
      return { credited: false, reason: 'already_credited' };
    }

    await addCredit(referredUserId, 1, `Referral bonus — referred by ${pending.referrer_id}`);
    await addCredit(
      pending.referrer_id as string,
      1,
      `Referral bonus — friend ${referredUserId} completed first interview`,
    );

    return { credited: true };
  }

  const prepared = await ensureReferralRowForCode(serviceClient, referredUserId, code);
  if (!prepared.ok) return { credited: false, reason: prepared.reason };
  return applyReferralBonusLegacy(serviceClient, referredUserId, undefined);
}
