import { isSafePath } from '@/lib/auth/auth-params';
import { isPaidPlanId, type PaidPlanId } from '@/lib/pricing/plans';

export function normalizePricingCampaignCode(raw: string | null | undefined): string | undefined {
  const code = raw?.trim().toUpperCase();
  return code && /^[A-Z0-9_-]{1,64}$/.test(code) ? code : undefined;
}

export function buildUpgradeIntentPath(plan: PaidPlanId, code?: string): string {
  const params = new URLSearchParams({ plan });
  const safeCode = normalizePricingCampaignCode(code);
  if (safeCode) params.set('code', safeCode);
  return `/upgrade?${params.toString()}`;
}

export function buildSignupIntentHref(plan: PaidPlanId, code?: string): string {
  return `/signup?${new URLSearchParams({ next: buildUpgradeIntentPath(plan, code) }).toString()}`;
}

export function parseUpgradeIntent(next: string | null | undefined): {
  plan?: PaidPlanId;
  code?: string;
} {
  if (!isSafePath(next) || !next.startsWith('/upgrade?')) return {};
  const params = new URLSearchParams(next.slice(next.indexOf('?') + 1));
  const rawPlan = params.get('plan');
  return {
    ...(rawPlan && isPaidPlanId(rawPlan) ? { plan: rawPlan } : {}),
    ...(normalizePricingCampaignCode(params.get('code'))
      ? { code: normalizePricingCampaignCode(params.get('code')) }
      : {}),
  };
}
