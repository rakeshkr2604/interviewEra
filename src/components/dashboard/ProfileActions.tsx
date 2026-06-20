import Link from 'next/link';
import { Crown, MessageSquare } from 'lucide-react';
import { formatPlanTierName } from '@/lib/pricing/plan-status';
import type { PlanTier } from '@/types/app.types';

interface ProfileActionsProps {
  planTier: PlanTier;
  isPaidActive: boolean;
  isPaidTier: boolean;
}

const primaryBtnClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm';

const secondaryBtnClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm';

export function ProfileActions({ planTier, isPaidActive, isPaidTier }: ProfileActionsProps) {
  const renewLabel =
    planTier === 'free'
      ? 'Upgrade plan'
      : isPaidActive
        ? 'Renew plan'
        : `Renew ${formatPlanTierName(planTier)}`;

  const showRenew = planTier === 'free' || isPaidActive || isPaidTier;

  return (
    <div className="grid w-full grid-cols-2 gap-2 min-[360px]:flex min-[360px]:min-w-[7.5rem] min-[360px]:max-w-[9.5rem] min-[360px]:flex-col">
      {showRenew ? (
        <Link href="/upgrade" className={primaryBtnClass}>
          <Crown size={16} aria-hidden />
          {renewLabel}
        </Link>
      ) : (
        <div className="min-[360px]:hidden" aria-hidden />
      )}
      <Link
        href="/feedback"
        className={secondaryBtnClass}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <MessageSquare size={16} aria-hidden />
        Give feedback
      </Link>
    </div>
  );
}
