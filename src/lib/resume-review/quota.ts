import type { SupabaseClient } from '@supabase/supabase-js';
import { isResumeReviewEligiblePlan, resumeReviewAllowanceFor } from '@/lib/resume-review/plan';

export type ResumeReviewQuota = {
  eligible: boolean;
  planTier: string;
  planActive: boolean;
  allowance: number;
  used: number;
  remaining: number;
  /** ISO timestamp anchoring the current billing cycle (users.plan_started_at). Null when ineligible. */
  cycleStart: string | null;
};

export type ResolveResumeReviewQuotaResult =
  | { ok: true; quota: ResumeReviewQuota }
  | { ok: false; error: string };

/**
 * Starter/Pro only, and only while the plan is actively paid (not expired —
 * plan_status flips to 'expired' by the plan-expiry cron, which is the same
 * signal every other paid-only gate in this app uses). cycle_start is
 * users.plan_started_at: it only changes on a renewal/upgrade
 * (lib/razorpay/activate-plan.ts), so it's a stable anchor for "this cycle"
 * without needing a separate billing-period table.
 */
export async function resolveResumeReviewQuota(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<ResolveResumeReviewQuotaResult> {
  const { data: user, error } = await serviceClient
    .from('users')
    .select('plan_tier, plan_status, plan_started_at, plan_expires_at')
    .eq('id', userId)
    .maybeSingle<{
      plan_tier: string;
      plan_status: string | null;
      plan_started_at: string | null;
      plan_expires_at: string | null;
    }>();

  if (error) return { ok: false, error: 'Failed to load plan.' };
  if (!user) return { ok: false, error: 'User not found.' };

  const planTier = user.plan_tier;
  const planActive =
    user.plan_status === 'active' &&
    (!user.plan_expires_at || new Date(user.plan_expires_at).getTime() > Date.now());

  if (!isResumeReviewEligiblePlan(planTier) || !planActive || !user.plan_started_at) {
    return {
      ok: true,
      quota: {
        eligible: false,
        planTier,
        planActive,
        allowance: 0,
        used: 0,
        remaining: 0,
        cycleStart: null,
      },
    };
  }

  const allowance = resumeReviewAllowanceFor(planTier);
  const cycleStart = user.plan_started_at;

  const { count, error: countError } = await serviceClient
    .from('resume_review_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('cycle_start', cycleStart)
    .neq('status', 'cancelled');

  if (countError) return { ok: false, error: 'Failed to load resume review usage.' };

  const used = count ?? 0;
  return {
    ok: true,
    quota: {
      eligible: true,
      planTier,
      planActive,
      allowance,
      used,
      remaining: Math.max(0, allowance - used),
      cycleStart,
    },
  };
}
