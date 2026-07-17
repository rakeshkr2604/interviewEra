/**
 * Pricing-tier visibility for v2.1 script reports.
 * Aligned with marketing plan cards:
 *   Free    — basic score + radar + speech
 *   Starter — full AI feedback, hiring signals, roadmap, per-answer notes
 *   Pro     — model answer examples + PDF export (+ campus)
 */

import type { PlanTier } from '@/types/app.types';

const TIER_ORDER: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  campus: 3,
  campus_admin: 3,
};

export function planAtLeast(userTier: PlanTier, required: PlanTier): boolean {
  return TIER_ORDER[userTier] >= TIER_ORDER[required];
}

/** Starter+ — recruiter assessment, hiring signals, intelligence, roadmap, answer notes. */
export function canSeeScriptReportDetails(tier: PlanTier): boolean {
  return planAtLeast(tier, 'starter');
}

/** Pro / campus — model answer comparisons + PDF. */
export function canSeeScriptReportPro(tier: PlanTier): boolean {
  return planAtLeast(tier, 'pro');
}

export function canExportScriptReportPdf(tier: PlanTier): boolean {
  return canSeeScriptReportPro(tier);
}
