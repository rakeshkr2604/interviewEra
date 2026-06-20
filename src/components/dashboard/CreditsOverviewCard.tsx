import Link from 'next/link';
import { AlertCircle, Coins, Play, Crown } from 'lucide-react';
import { formatPlanTierName, isPaidPlanActive } from '@/lib/pricing/plan-status';
import type { PlanTier } from '@/types/app.types';

interface CreditsOverviewCardProps {
  creditsRemaining: number;
  completedCount: number;
  planTier: PlanTier;
  planExpiresAt: string | null;
  planStatus: string | null;
}

export function CreditsOverviewCard({
  creditsRemaining,
  completedCount,
  planTier,
  planExpiresAt,
  planStatus,
}: CreditsOverviewCardProps) {
  const isPaidActive = isPaidPlanActive(planTier, planStatus, planExpiresAt);
  const isPaidTier = planTier === 'starter' || planTier === 'pro';
  const showExpiredWarning = isPaidTier && !isPaidActive;

  return (
    <section className="dashboard-premium-card mb-4 px-4 py-4 sm:mb-5 sm:px-6 sm:py-5">
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex size-8 items-center justify-center rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Coins size={16} aria-hidden />
        </div>
        <h2 className="text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
          Credits Overview
        </h2>
      </div>

      <div
        className="grid grid-cols-3 rounded-xl"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {[
          { label: 'Total credits', value: creditsRemaining },
          { label: 'Per interview', value: 1 },
          { label: 'Interviews', value: completedCount },
        ].map((metric, index) => (
          <div
            key={metric.label}
            className="min-w-0 px-2 py-3 text-center sm:px-4 sm:py-4"
            style={
              index > 0
                ? { borderLeft: '1px solid var(--card-border)' }
                : undefined
            }
          >
            <p
              className="text-[9px] font-bold uppercase tracking-[0.1em] leading-tight sm:text-[10px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {metric.label}
            </p>
            <p
              className="mt-1 text-xl font-bold tabular-nums leading-none sm:text-2xl"
              style={{ color: 'var(--accent-primary)' }}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
        1 interview = 1 credit
      </p>

      {showExpiredWarning ? (
        <div
          className="mt-4 flex gap-2.5 rounded-xl border px-3.5 py-3 sm:px-4"
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
            Your {formatPlanTierName(planTier)} access has ended. Renew your plan to continue tracking
            and improving.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Link
          href="/onboarding"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          style={{ background: 'var(--accent-primary)' }}
        >
          <Play size={16} aria-hidden />
          Practice interview
        </Link>
        {showExpiredWarning || planTier === 'free' ? (
          <Link
            href="/upgrade"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-[transform,opacity] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            <Crown size={16} aria-hidden />
            {showExpiredWarning ? `Renew ${formatPlanTierName(planTier)} for 30 days` : 'Upgrade plan'}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
