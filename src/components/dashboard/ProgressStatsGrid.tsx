import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Clock, Flame, TrendingUp } from 'lucide-react';
import {
  formatPlanTierName,
  isPaidPlanActive,
  planExpiryStatusLine,
} from '@/lib/pricing/plan-status';
import type { PlanTier } from '@/types/app.types';

interface ProgressStatsGridProps {
  completedCount: number;
  avgScore: string | null;
  currentStreak: number;
  creditsRemaining: number;
  planTier: PlanTier;
  planExpiresAt: string | null;
  planStatus: string | null;
}

function ProgressStatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string | null;
}) {
  return (
    <div className="dashboard-premium-card min-w-0 px-3.5 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="text-[9px] font-bold uppercase tracking-[0.12em] leading-tight sm:text-[10px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </p>
          <p
            className="mt-1.5 text-2xl font-bold tabular-nums leading-none sm:text-3xl lg:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </p>
          {sub ? (
            <p
              className="mt-1 truncate text-[10px] font-medium sm:text-[11px]"
              style={{ color: 'var(--accent-primary)' }}
            >
              {sub}
            </p>
          ) : null}
        </div>
        <div
          className="rounded-xl p-2"
          style={{
            background: 'var(--accent-primary)18',
            color: 'var(--accent-primary)',
          }}
        >
          <Icon size={16} aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function ProgressStatsGrid({
  completedCount,
  avgScore,
  currentStreak,
  creditsRemaining,
  planTier,
  planExpiresAt,
  planStatus,
}: ProgressStatsGridProps) {
  const paidActive = isPaidPlanActive(planTier, planStatus, planExpiresAt);
  const planStatSub =
    paidActive && planExpiresAt
      ? `${formatPlanTierName(planTier)} · ${planExpiryStatusLine(planExpiresAt, true) ?? ''}`
      : null;

  return (
    <section className="mb-4 sm:mb-6 lg:mb-8">
      <h2 className="mb-3 px-0.5 text-base font-semibold lg:mb-4 lg:text-lg" style={{ color: 'var(--text-primary)' }}>
        Progress summary
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:gap-6">
        <ProgressStatCard
          label="Interviews completed"
          value={completedCount}
          icon={CheckCircle2}
        />
        <ProgressStatCard
          label="Average score"
          value={avgScore ? `${avgScore}/10` : '—'}
          icon={TrendingUp}
        />
        <ProgressStatCard
          label="Current streak"
          value={`${currentStreak}d`}
          icon={Flame}
        />
        <ProgressStatCard
          label="Credits left"
          value={creditsRemaining}
          icon={Clock}
          sub={planStatSub}
        />
      </div>
    </section>
  );
}
