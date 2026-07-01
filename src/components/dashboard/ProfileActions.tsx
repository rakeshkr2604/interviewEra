import Link from 'next/link';
import { Crown, MessageSquare } from 'lucide-react';
import { formatPlanTierName } from '@/lib/pricing/plan-status';
import type { PlanTier } from '@/types/app.types';

interface ProfileActionsProps {
  planTier: PlanTier;
  isPaidActive: boolean;
  isPaidTier: boolean;
}

const secondaryBtnClass =
  'inline-flex min-h-10 w-full flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm lg:min-h-10';

export function ProfileActions({ planTier, isPaidActive, isPaidTier }: ProfileActionsProps) {
  const renewLabel =
    planTier === 'free'
      ? 'Upgrade plan'
      : isPaidActive
        ? 'Renew plan'
        : `Renew ${formatPlanTierName(planTier)}`;

  const showRenew = planTier === 'free' || isPaidActive || isPaidTier;
  const hideRenewOnDesktop = isPaidTier && !isPaidActive;

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:max-w-none lg:flex-row lg:gap-2.5">
      {showRenew ? (
        <Link
          href="/upgrade"
          className={`${secondaryBtnClass}${hideRenewOnDesktop ? ' lg:hidden' : ''}`}
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            color: 'var(--text-secondary)',
          }}
        >
          <Crown size={16} aria-hidden />
          {renewLabel}
        </Link>
      ) : null}
      <Link
        href="/feedback"
        className={`${secondaryBtnClass}${hideRenewOnDesktop ? ' lg:flex-initial lg:px-5' : ''}`}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
          color: 'var(--text-secondary)',
        }}
      >
        <MessageSquare size={16} aria-hidden />
        Give feedback
      </Link>
    </div>
  );
}
