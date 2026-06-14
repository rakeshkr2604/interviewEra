/**
 * Plan expiry helpers — UI only (IST-aware display).
 */

import { formatPlanExpiryEnIn } from '@/lib/pricing/copy';

import type { PlanTier } from '@/types/app.types';

export function formatPlanTierName(tier: string): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'starter':
      return 'Starter';
    case 'pro':
      return 'Pro';
    case 'campus':
      return 'Campus';
    case 'campus_admin':
      return 'Campus admin';
    default:
      return tier;
  }
}

export function planDaysRemaining(iso: string): number | null {
  const expires = new Date(iso);
  if (Number.isNaN(expires.getTime())) return null;
  const ms = expires.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Shown under Current Plan badge when expiry data exists. */
export function planExpiryStatusLine(iso: string, isActive: boolean): string | null {
  if (!iso) return null;
  const expires = new Date(iso);
  if (Number.isNaN(expires.getTime())) return null;

  if (!isActive) {
    return `Expired ${formatPlanExpiryEnIn(iso)}`;
  }

  const days = planDaysRemaining(iso);
  if (days === null) return null;
  if (days === 0) return `Expires today`;
  if (days === 1) return '1 day remaining';
  if (days <= 30) return `${days} days remaining`;
  return `Expires ${formatPlanExpiryEnIn(iso)}`;
}

export function isPaidPlanActive(
  planTier: string,
  planStatus: string | null | undefined,
  planExpiresAt: string | null | undefined,
): boolean {
  if (planTier !== 'starter' && planTier !== 'pro') return false;
  if (planStatus !== 'active' || !planExpiresAt) return false;
  const expires = new Date(planExpiresAt);
  return !Number.isNaN(expires.getTime()) && expires > new Date();
}

export function isRenewalCheckout(
  plan: 'starter' | 'pro',
  currentPlan: string,
  planExpiresAt: string | null | undefined,
  planStatus: string | null | undefined,
): boolean {
  return (
    currentPlan === plan &&
    isPaidPlanActive(currentPlan, planStatus, planExpiresAt)
  );
}
