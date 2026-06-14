import type { ReactNode } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { planPeriodLine, planPriceLine } from '@/lib/pricing/copy';
import type { PlanTier } from '@/types/app.types';

interface BlurredSectionProps {
  userTier: PlanTier;
  requiredTier: PlanTier;
  children: ReactNode;
  upgradeLabel?: string;
}

const TIER_ORDER: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  campus: 3,
  campus_admin: 3,
};

export function BlurredSection({
  userTier,
  requiredTier,
  children,
  upgradeLabel = 'Upgrade to unlock this section',
}: BlurredSectionProps) {
  const hasAccess = TIER_ORDER[userTier] >= TIER_ORDER[requiredTier];

  // Access granted: render content as-is, no wrappers, no blur
  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied: render a SKELETON PLACEHOLDER only.
  // The actual {children} are intentionally NOT rendered in the DOM —
  // this prevents any user from reading gated content via DevTools.
  const planLabel = requiredTier === 'pro' ? 'Pro' : 'Starter';
  const planPrice = planPriceLine(requiredTier === 'pro' ? 'pro' : 'starter');
  const planPeriod = planPeriodLine();

  return (
    <div
      className="relative overflow-hidden rounded-xl border-2 p-4"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
      }}
    >
      <div aria-hidden="true" className="pointer-events-none space-y-2.5 select-none">
        {['100%', '83%', '67%', '100%', '75%', '83%'].map((width, i) => (
          <div
            key={i}
            className="h-3 max-w-full animate-pulse rounded"
            style={{
              width,
              background: 'color-mix(in srgb, var(--text-muted) 35%, transparent)',
            }}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center rounded-[10px] backdrop-blur-[2px]"
        style={{ background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)' }}
      >
        <Lock className="mb-2 h-4 w-4" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        <p className="px-4 text-center text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {upgradeLabel}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {planLabel} — {planPrice} · {planPeriod}
        </p>
        <Link
          href="/upgrade"
          className="landing-cta-lift mt-3 inline-flex items-center rounded-[12px] px-4 py-2 text-sm font-semibold text-white"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
            boxShadow: '0 12px 32px color-mix(in srgb, var(--accent-primary) 28%, transparent)',
          }}
        >
          Upgrade to {planLabel}
        </Link>
      </div>
    </div>
  );
}
