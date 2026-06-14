import Link from 'next/link';
import { PlacementCountdown } from '@/components/layout/PlacementCountdown';
import { PlanStatusHeader } from '@/components/pricing/PlanStatusHeader';
import { planExpiresCopy } from '@/lib/pricing/copy';
import {
  formatPlanTierName,
  isPaidPlanActive,
} from '@/lib/pricing/plan-status';
import type { UserRow } from './dashboard-types';
import type { PlanTier } from '@/types/app.types';

const upgradeLinkClassName =
  'inline-flex h-7 shrink-0 items-center justify-center rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-all hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
export function DashboardWelcomeCard({
  userData,
  displayName,
  memberSince,
  creditsRemaining,
  completedCount,
}: {
  userData: UserRow | null;
  displayName: string;
  memberSince: string
  creditsRemaining: number
  completedCount: number
}) {
  const planTier = (userData?.plan_tier ?? 'free') as PlanTier;
  const planExpiresAt = userData?.plan_expires_at ?? null;
  const planStatus = userData?.plan_status ?? null;
  const isPaidActive = isPaidPlanActive(planTier, planStatus, planExpiresAt);
  const isPaidTier = planTier === 'starter' || planTier === 'pro';

  return (
    <div className="dashboard-premium-card mb-6 flex flex-wrap items-start justify-between gap-4 px-6 py-5 sm:px-7">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Hi, {displayName}
          </p>
          {isPaidActive && planExpiresAt ? (
            <PlanStatusHeader planExpiresAt={planExpiresAt} isActive />
          ) : planTier === 'free' ? (
            <span
              className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{
                borderColor: 'var(--card-border)',
                color: 'var(--text-secondary)',
                background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              }}
            >
              Free plan
            </span>
          ) : isPaidTier && planExpiresAt ? (
            <PlanStatusHeader planExpiresAt={planExpiresAt} isActive={false} />
          ) : null}
        </div>

        <p className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
          Member since {memberSince} &nbsp;·&nbsp; Interviews completed: {completedCount}{' '}
          &nbsp;·&nbsp; Credits: {creditsRemaining} &nbsp;·&nbsp; 1 interview = 1 credit
        </p>

        {isPaidActive && planExpiresAt ? (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {planExpiresCopy(planExpiresAt, true)}{' '}
            <span style={{ color: 'var(--text-secondary)' }}>
              One-time payment · no auto-renewal.
            </span>
          </p>
        ) : planTier === 'free' ? (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Pay once for 30-day Starter or Pro access when you need more credits and features.
          </p>
        ) : isPaidTier && planExpiresAt && !isPaidActive ? (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Your {formatPlanTierName(planTier)} access has ended.{' '}
            <Link href="/upgrade" className="font-medium text-[var(--accent-primary)] underline-offset-2 hover:underline">
              Renew for 30 days
            </Link>
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {userData?.placement_date ? (
          <PlacementCountdown
            placementDate={userData.placement_date}
            interviewsCompleted={completedCount}
          />
        ) : null}
        {planTier === 'free' || isPaidActive ? (
          <Link href="/upgrade" className={upgradeLinkClassName}>
            {planTier === 'free' ? 'Upgrade plan' : 'Renew plan'}
          </Link>
        ) : isPaidTier ? (
          <Link href="/upgrade" className={upgradeLinkClassName}>
            Renew {formatPlanTierName(planTier)}
          </Link>
        ) : null}        <Link
          href="/feedback"
          className="rounded-[14px] border-2 px-4 py-2.5 text-sm font-semibold transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          Give feedback
        </Link>
      </div>
    </div>
  );
}
