import { User, CalendarDays, CheckCircle2 } from 'lucide-react';
import { PlacementCountdown } from '@/components/layout/PlacementCountdown';
import { CurrentPlanBadge } from '@/components/pricing/CurrentPlanBadge';
import { planExpiresCopy } from '@/lib/pricing/copy';
import {
  formatPlanTierName,
  isPaidPlanActive,
  planExpiryStatusLine,
} from '@/lib/pricing/plan-status';
import { DashboardMetricTile } from '@/components/dashboard/DashboardMetricTile';
import { ProfileActions } from '@/components/dashboard/ProfileActions';
import type { UserRow } from '@/app/(dashboard)/dashboard/dashboard-types';
import type { PlanTier } from '@/types/app.types';
import Link from 'next/link';

interface UserSummaryCardProps {
  userData: UserRow | null;
  displayName: string;
  memberSince: string;
  completedCount: number;
}

export function UserSummaryCard({
  userData,
  displayName,
  memberSince,
  completedCount,
}: UserSummaryCardProps) {
  const planTier = (userData?.plan_tier ?? 'free') as PlanTier;
  const planExpiresAt = userData?.plan_expires_at ?? null;
  const planStatus = userData?.plan_status ?? null;
  const isPaidActive = isPaidPlanActive(planTier, planStatus, planExpiresAt);
  const isPaidTier = planTier === 'starter' || planTier === 'pro';

  const expiryLine =
    planExpiresAt && (isPaidActive || isPaidTier)
      ? planExpiryStatusLine(planExpiresAt, isPaidActive)
      : null;

  return (
    <section className="dashboard-premium-card mb-4 px-4 py-4 sm:mb-5 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 min-[360px]:flex-row min-[360px]:items-start min-[360px]:justify-between min-[360px]:gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full sm:size-14"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-secondary))',
              color: 'var(--accent-primary)',
            }}
            aria-hidden
          >
            <User size={22} aria-hidden />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 className="text-lg font-semibold leading-tight sm:text-xl" style={{ color: 'var(--text-primary)' }}>
              Hi, {displayName}
            </h2>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {isPaidActive && planExpiresAt ? (
                <>
                  <CurrentPlanBadge />
                  {expiryLine ? (
                    <span className="text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                      {expiryLine}
                    </span>
                  ) : null}
                </>
              ) : planTier === 'free' ? (
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-secondary)',
                    background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                  }}
                >
                  Free plan
                </span>
              ) : isPaidTier && planExpiresAt ? (
                <>
                  <CurrentPlanBadge />
                  {expiryLine ? (
                    <span className="text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                      {expiryLine}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>

            {userData?.placement_date ? (
              <div className="pt-0.5">
                <PlacementCountdown
                  placementDate={userData.placement_date}
                  interviewsCompleted={completedCount}
                />
              </div>
            ) : null}
          </div>
        </div>

        <ProfileActions
          planTier={planTier}
          isPaidActive={isPaidActive}
          isPaidTier={isPaidTier}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
        <DashboardMetricTile label="Member since" value={memberSince || '—'} icon={CalendarDays} />
        <DashboardMetricTile
          label="Interviews completed"
          value={completedCount}
          icon={CheckCircle2}
        />
      </div>

      {isPaidActive && planExpiresAt ? (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {planExpiresCopy(planExpiresAt, true)}{' '}
          <span style={{ color: 'var(--text-secondary)' }}>One-time payment · no auto-renewal.</span>
        </p>
      ) : planTier === 'free' ? (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Pay once for 30-day Starter or Pro access when you need more credits and features.
        </p>
      ) : isPaidTier && planExpiresAt && !isPaidActive ? (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Your {formatPlanTierName(planTier)} access has ended.{' '}
          <Link
            href="/upgrade"
            className="font-medium text-[var(--accent-primary)] underline-offset-2 hover:underline"
          >
            Renew for 30 days
          </Link>
        </p>
      ) : null}
    </section>
  );
}
