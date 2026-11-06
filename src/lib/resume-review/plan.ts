import type { PlanTier } from '@/types/app.types';

/** Resume-review session requests allowed per billing cycle, by plan. Free/campus/campus_admin get 0. */
export const RESUME_REVIEW_ALLOWANCE: Record<string, number> = {
  starter: 1,
  pro: 2,
};

export type ResumeReviewEligiblePlan = 'starter' | 'pro';

export function isResumeReviewEligiblePlan(
  planTier: string | null | undefined,
): planTier is ResumeReviewEligiblePlan {
  return planTier === 'starter' || planTier === 'pro';
}

export function resumeReviewAllowanceFor(planTier: PlanTier | string | null | undefined): number {
  if (!planTier) return 0;
  return RESUME_REVIEW_ALLOWANCE[planTier] ?? 0;
}
