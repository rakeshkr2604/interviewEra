import Link from 'next/link';
import { Target } from 'lucide-react';
import { planExpiryStatusLine } from '@/lib/pricing/plan-status';
import { isPaidPlanActive } from '@/lib/pricing/plan-status';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';
import {
  DashboardRecoveryCta,
  type DashboardRecoveryInterview,
} from '@/components/dashboard/DashboardRecoveryCta';
import type { UserRow } from '@/app/(dashboard)/dashboard/dashboard-types';
import type { PlanTier } from '@/types/app.types';

interface UserSummaryCardProps {
  userData: UserRow | null;
  /** Primary unfinished interview for hero CTA (active Continue or abandoned Resume). */
  recoveryInterview?: DashboardRecoveryInterview | null;
  /** From the personalized roadmap — shown here so "Your plan" reads role-first. */
  targetRole: string;
  weakDimensionLabels: string[];
}

export function UserSummaryCard({
  userData,
  recoveryInterview = null,
  targetRole,
  weakDimensionLabels,
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

  const showPlanBadge = (isPaidActive || isPaidTier) && planExpiresAt;

  return (
    <section
      className="dashboard-premium-card relative flex flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6"
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

      <div className="flex min-w-0 items-center gap-3 lg:gap-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
            color: 'var(--accent-primary)',
          }}
          aria-hidden
        >
          <Target className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Your Plan
            </p>
            {showPlanBadge ? (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: 'color-mix(in srgb, var(--accent-success) 16%, transparent)', color: 'var(--accent-success)' }}
              >
                Current Plan
              </span>
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
            ) : null}
            {expiryLine ? (
              <span
                className="text-xs font-medium tabular-nums"
                style={{ color: isPaidActive ? 'var(--accent-success)' : 'var(--accent-warning)' }}
              >
                {expiryLine}
              </span>
            ) : null}
          </div>

          <h2
            id="user-summary-heading"
            className="mt-1 text-lg font-bold leading-tight sm:text-xl lg:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {targetRole}
          </h2>
          {weakDimensionLabels.length > 0 ? (
            <p className="mt-0.5 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
              Focusing on {weakDimensionLabels.join(', ')}
            </p>
          ) : null}
        </div>
      </div>

      {recoveryInterview ? (
        <div className="mt-4">
          <DashboardRecoveryCta interview={recoveryInterview} />
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Link
          href={getDefaultInterviewStartPath()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
          style={{ background: 'var(--accent-primary)' }}
        >
          Continue Practice
          <span aria-hidden>→</span>
        </Link>
        <Link
          href="/roadmap"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 hover:shadow-sm"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
        >
          View Plan Details
        </Link>
      </div>
    </section>
  );
}
