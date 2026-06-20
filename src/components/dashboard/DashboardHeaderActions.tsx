'use client';

import Link from 'next/link';
import { CreditBadge } from '@/components/layout/CreditBadge';
import { cn } from '@/lib/utils';
import {
  formatPlanTierName,
  isPaidPlanActive,
  planExpiryStatusLine,
} from '@/lib/pricing/plan-status';
import type { PlanTier } from '@/types/app.types';

interface DashboardHeaderActionsProps {
  creditsRemaining: number;
  planTier?: string | null;
  planExpiresAt?: string | null;
  planStatus?: string | null;
}

export function DashboardHeaderActions({
  creditsRemaining,
  planTier = 'free',
  planExpiresAt,
  planStatus,
}: DashboardHeaderActionsProps) {
  const tier = (planTier ?? 'free') as PlanTier;
  const paidActive = isPaidPlanActive(tier, planStatus, planExpiresAt);
  const expiryLine =
    paidActive && planExpiresAt ? planExpiryStatusLine(planExpiresAt, true) : null;

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:items-end">
      <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
        {paidActive && planExpiresAt ? (
          <Link
            href="/upgrade"
            className={cn(
              'inline-flex max-w-[11rem] truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-opacity hover:opacity-90 sm:max-w-none',
            )}
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
              background: 'color-mix(in srgb, var(--accent-primary) 10%, var(--card-bg))',
              color: 'var(--accent-primary)',
            }}
          >
            {formatPlanTierName(tier)}
            {expiryLine ? ` · ${expiryLine}` : ''}
          </Link>
        ) : tier === 'free' ? (
          <Link
            href="/upgrade"
            className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{
              borderColor: 'var(--card-border)',
              color: 'var(--text-secondary)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            }}
          >
            Free plan
          </Link>
        ) : null}
        <CreditBadge
          creditsRemaining={creditsRemaining}
          planTier={tier}
          planExpiresAt={planExpiresAt}
          planStatus={planStatus}
        />
      </div>
    </div>
  );
}
