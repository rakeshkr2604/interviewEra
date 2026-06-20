import Link from 'next/link';
import { AlertCircle, Coins, Play, Crown } from 'lucide-react';
import { formatPlanTierName, isPaidPlanActive } from '@/lib/pricing/plan-status';
import type { PlanTier } from '@/types/app.types';

interface CreditsOverviewCardProps {
  creditsRemaining: number;
  planTier: PlanTier;
  planExpiresAt: string | null;
  planStatus: string | null;
}

export function CreditsOverviewCard({
  creditsRemaining,
  planTier,
  planExpiresAt,
  planStatus,
}: CreditsOverviewCardProps) {
  const isPaidActive = isPaidPlanActive(planTier, planStatus, planExpiresAt);
  const isPaidTier = planTier === 'starter' || planTier === 'pro';
  const showExpiredWarning = isPaidTier && !isPaidActive;

  return (
    <section className="dashboard-premium-card relative mb-4 flex flex-col overflow-hidden px-4 py-4 sm:mb-5 sm:px-6 sm:py-5 lg:mb-0 lg:h-full lg:px-7 lg:py-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{
          background:
            'linear-gradient(90deg, color-mix(in srgb, var(--accent-success) 80%, var(--accent-primary)), transparent)',
        }}
        aria-hidden
      />

      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-8 items-center justify-center rounded-lg lg:size-9"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            <Coins size={16} className="lg:size-[1.125rem]" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold sm:text-lg lg:text-xl" style={{ color: 'var(--text-primary)' }}>
              Credits
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              1 credit per mock interview
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex flex-col justify-center rounded-2xl px-5 py-5 lg:px-6 lg:py-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--text-muted)' }}
        >
          Available
        </p>
        <p
          className="mt-1 text-4xl font-bold tabular-nums leading-none tracking-tight sm:text-5xl lg:text-[3.25rem]"
          style={{ color: 'var(--accent-primary)' }}
        >
          {creditsRemaining}
        </p>
      </div>

      {showExpiredWarning ? (
        <div
          className="mt-4 flex gap-2.5 rounded-xl border px-3.5 py-3 sm:px-4 lg:mt-5"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-warning) 35%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-warning) 10%, var(--bg-secondary))',
          }}
          role="status"
        >
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
            style={{ color: 'var(--accent-warning)' }}
            aria-hidden
          />
          <p className="text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your {formatPlanTierName(planTier)} access has ended. Renew to keep full tracking.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:mt-auto lg:flex lg:max-w-xl lg:pt-5 lg:gap-3">
        <Link
          href="/onboarding"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:flex-1"
          style={{ background: 'var(--accent-primary)' }}
        >
          <Play size={16} aria-hidden />
          Practice interview
        </Link>
        {showExpiredWarning || planTier === 'free' ? (
          <Link
            href="/upgrade"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:flex-1"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            <Crown size={16} aria-hidden />
            {showExpiredWarning ? `Renew ${formatPlanTierName(planTier)}` : 'Upgrade plan'}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
