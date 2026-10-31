import Link from 'next/link';
import { AlertCircle, Coins, Play, Crown, HelpCircle, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { formatPlanTierName, isPaidPlanActive } from '@/lib/pricing/plan-status';
import { FREE_PLAN, PAID_PLANS } from '@/lib/pricing/plans';
import type { PlanTier } from '@/types/app.types';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';

/** Credit allotment per tier — the plan's grant amount, not a usage-cycle cap. */
function creditAllotment(planTier: PlanTier): number | null {
  if (planTier === 'starter' || planTier === 'pro') return PAID_PLANS[planTier].credits;
  if (planTier === 'free') return FREE_PLAN.credits;
  return null; // campus / campus_admin — no fixed allotment to show a bar against.
}

interface CreditsOverviewCardProps {
  creditsRemaining: number;
  planTier: PlanTier;
  planExpiresAt: string | null;
  planStatus: string | null;
  /** When true, an in-progress session CTA is the dashboard anchor — practice becomes secondary. */
  demotePracticeCta?: boolean;
}

export function CreditsOverviewCard({
  creditsRemaining,
  planTier,
  planExpiresAt,
  planStatus,
  demotePracticeCta = false,
}: CreditsOverviewCardProps) {
  const isPaidActive = isPaidPlanActive(planTier, planStatus, planExpiresAt);
  const isPaidTier = planTier === 'starter' || planTier === 'pro';
  const showExpiredWarning = isPaidTier && !isPaidActive;
  const isPracticePrimary = !demotePracticeCta;
  const allotment = creditAllotment(planTier);
  // Clamp at 100% rather than hide the bar — a manual admin top-up beyond the
  // plan's normal allotment is rare and still reads fine as "fully stocked up".
  const allotmentPercent =
    allotment && allotment > 0 ? Math.min(100, Math.round((creditsRemaining / allotment) * 100)) : null;

  return (
    <section
      className="dashboard-premium-card relative flex flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6"
      aria-labelledby="credits-overview-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, color-mix(in srgb, var(--accent-success) 80%, var(--accent-primary)), transparent)',
        }}
        aria-hidden
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 lg:mb-5">
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
          <h2
            id="credits-overview-heading"
            className="dashboard-section-title !mt-0 flex items-center gap-1.5 text-base sm:text-lg lg:text-xl"
          >
            Practice Credits
            <HelpCircle
              size={15}
              style={{ color: 'var(--text-muted)' }}
              aria-label="1 credit starts one mock interview session"
            />
          </h2>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-bold text-white"
          style={{ background: 'var(--accent-success)' }}
        >
          {creditsRemaining} credits left
        </span>
      </div>

      <div
        className="flex flex-col justify-center rounded-2xl px-5 py-5 lg:px-6 lg:py-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <p className="dashboard-section-eyebrow" style={{ color: 'var(--text-muted)' }}>
          Available
        </p>
        <p
          className="mt-1 text-4xl font-bold tabular-nums leading-none tracking-tight sm:text-5xl lg:text-[3.25rem]"
          style={{ color: 'var(--accent-primary)' }}
          aria-label={
            allotment
              ? `${creditsRemaining} of ${allotment} credits remaining`
              : `${creditsRemaining} credits available`
          }
        >
          {creditsRemaining}
          {allotment ? (
            <span className="text-xl font-semibold sm:text-2xl" style={{ color: 'var(--text-muted)' }}>
              {' '}
              / {allotment}
            </span>
          ) : null}
        </p>
        {allotmentPercent != null ? (
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full"
              style={{ background: 'var(--bg-tertiary)' }}
              role="progressbar"
              aria-valuenow={allotmentPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Credits remaining"
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${allotmentPercent}%`, background: 'var(--accent-primary)' }}
              />
            </div>
            <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {allotmentPercent}%
            </span>
          </div>
        ) : null}
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          1 credit = 1 mock interview session
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

      {/* Fills remaining height when this card sits next to a taller sibling
          (left column stretches via grid items-stretch) — genuinely useful
          copy, not a spacer, so the extra room reads as content, not padding. */}
      <div className="my-4 flex flex-1 flex-col justify-center gap-2.5">
        {[
          { icon: Zap, text: 'Credits apply to every mock type — technical, HR, and resume-deep-dive sessions.' },
          { icon: ShieldCheck, text: 'Unused credits stay in your account while your plan is active — no forced reset.' },
          { icon: Sparkles, text: 'Every session includes detailed AI feedback on structure, clarity, and depth.' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md"
              style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)', color: 'var(--accent-primary)' }}
              aria-hidden
            >
              <Icon size={13} />
            </span>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex lg:max-w-xl lg:gap-3">
        <Link
          href={getDefaultInterviewStartPath()}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:flex-1 ${
            isPracticePrimary
              ? 'text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md'
              : 'border-2 hover:-translate-y-0.5 hover:shadow-sm'
          }`}
          style={
            isPracticePrimary
              ? { background: 'var(--accent-primary)' }
              : {
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                  color: 'var(--text-primary)',
                }
          }
        >
          <Play size={16} aria-hidden />
          Start New Mock
        </Link>
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
          {showExpiredWarning ? `Renew ${formatPlanTierName(planTier)}` : 'Buy Credits'}
        </Link>
      </div>
    </section>
  );
}
