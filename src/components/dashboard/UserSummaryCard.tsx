import Link from 'next/link';
import {
  BarChart2,
  CalendarDays,
  CheckCircle2,
  Flame,
  History,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { UserAvatar } from '@/components/profile/UserAvatar';
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
import { activeInterviewResumePath } from '@/lib/interview/active-interview-policy';
import type { UserRow } from '@/app/(dashboard)/dashboard/dashboard-types';
import type { PlanTier } from '@/types/app.types';

interface UserSummaryCardProps {
  userData: UserRow | null;
  displayName: string;
  memberSince: string;
  completedCount: number;
  avgScore: string | null;
  currentStreak: number;
  email: string;
  avatarPath?: string | null;
  oauthPictureUrl?: string | null;
  inProgressInterview?: { id: string; role: string; engine?: string | null } | null;
}

const QUICK_LINKS = [
  { href: '/history', label: 'History', icon: History },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function UserSummaryCard({
  userData,
  displayName,
  memberSince,
  completedCount,
  avgScore,
  currentStreak,
  email,
  avatarPath = null,
  oauthPictureUrl = null,
  inProgressInterview = null,
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

  const streakLabel = currentStreak === 1 ? '1 day' : `${currentStreak} days`;

  return (
    <section
      className="dashboard-premium-card relative flex h-full flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6"
      aria-labelledby="user-summary-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 40%, transparent))',
        }}
        aria-hidden
      />

      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="flex min-w-0 items-start gap-3 sm:gap-3.5 lg:gap-4">
          <Link
            href="/settings#settings-account"
            className="shrink-0 rounded-full outline-none ring-2 ring-transparent transition-shadow hover:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)] focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)]"
            aria-label="Edit profile photo in settings"
          >
            <UserAvatar
              name={displayName}
              email={email}
              avatarPath={avatarPath}
              oauthPictureUrl={oauthPictureUrl}
              size="lg"
              className="size-12 ring-2 ring-[color-mix(in_srgb,var(--accent-primary)_18%,transparent)] sm:size-14 lg:size-16"
            />
          </Link>

          <div className="min-w-0 flex-1 space-y-1.5 lg:space-y-2">
            <h2
              id="user-summary-heading"
              className="text-lg font-semibold leading-tight sm:text-xl lg:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Hi, {displayName}
            </h2>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {isPaidActive && planExpiresAt ? (
                <>
                  <CurrentPlanBadge />
                  {expiryLine ? (
                    <span
                      className={`text-xs font-medium tabular-nums lg:text-sm ${
                        isPaidActive
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {expiryLine}
                    </span>
                  ) : null}
                </>
              ) : planTier === 'free' ? (
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold lg:text-xs"
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
                    <span
                      className={`text-xs font-medium tabular-nums lg:text-sm ${
                        isPaidActive
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {expiryLine}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>

            {memberSince ? (
              <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <CalendarDays size={13} className="shrink-0 opacity-70" aria-hidden />
                Member since {memberSince}
              </p>
            ) : null}

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

        {inProgressInterview ? (
          <Link
            href={activeInterviewResumePath(inProgressInterview.engine, inProgressInterview.id)}
            className="dashboard-hover-lift flex min-h-12 items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 45%, var(--card-border))',
              background: 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-secondary))',
              textDecoration: 'none',
            }}
          >
            <div className="min-w-0">
              <p className="dashboard-section-eyebrow">Resume session</p>
              <p className="mt-0.5 truncate text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                {inProgressInterview.role}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
              Continue →
            </span>
          </Link>
        ) : null}

        <ProfileActions
          planTier={planTier}
          isPaidActive={isPaidActive}
          isPaidTier={isPaidTier}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:mt-6 lg:flex-1 lg:justify-end">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <DashboardMetricTile label="Completed" value={completedCount} icon={CheckCircle2} compact />
          <DashboardMetricTile
            label="Avg score"
            value={avgScore ? `${avgScore}/10` : '—'}
            icon={TrendingUp}
            compact
          />
          <DashboardMetricTile label="Streak" value={streakLabel} icon={Flame} compact />
        </div>

        <nav aria-label="Quick navigation">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="dashboard-hover-lift flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2.5 text-center active:opacity-90 sm:gap-1.5 sm:px-2 sm:py-3"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 90%, transparent)',
                  textDecoration: 'none',
                }}
              >
                <Icon size={18} style={{ color: 'var(--text-muted)' }} aria-hidden />
                <span className="text-[11px] font-medium sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {isPaidActive && planExpiresAt ? (
        <p className="mt-4 text-xs leading-relaxed lg:hidden" style={{ color: 'var(--text-muted)' }}>
          {planExpiresCopy(planExpiresAt, true)}{' '}
          <span style={{ color: 'var(--text-secondary)' }}>One-time payment · no auto-renewal.</span>
        </p>
      ) : planTier === 'free' ? (
        <p className="mt-4 text-xs leading-relaxed lg:hidden" style={{ color: 'var(--text-muted)' }}>
          Pay once for 30-day Starter or Pro access when you need more credits and features.
        </p>
      ) : isPaidTier && planExpiresAt && !isPaidActive ? (
        <p className="mt-4 text-xs leading-relaxed lg:hidden" style={{ color: 'var(--text-muted)' }}>
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
