'use client';

import { useState } from 'react';
import {
  formatPlanTierName,
  isPaidPlanActive,
  planExpiryStatusLine,
} from '@/lib/pricing/plan-status';
import { planExpiresCopy } from '@/lib/pricing/copy';
import type { PlanTier } from '@/types/app.types';

interface CreditBadgeProps {
  creditsRemaining: number;
  planTier?: PlanTier;
  planExpiresAt?: string | null;
  planStatus?: string | null;
}

export function CreditBadge({
  creditsRemaining,
  planTier = 'free',
  planExpiresAt,
  planStatus,
}: CreditBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const bg =
    creditsRemaining === 0
      ? 'var(--accent-danger)'
      : creditsRemaining <= 2
        ? 'var(--accent-warning)'
        : 'var(--accent-success)';

  const paidActive = isPaidPlanActive(planTier, planStatus, planExpiresAt);
  const expiryLine =
    planExpiresAt && (planTier === 'starter' || planTier === 'pro')
      ? planExpiryStatusLine(planExpiresAt, paidActive)
      : null;

  return (
    <div className="relative inline-block">
      <span
        role="status"
        aria-label={`${creditsRemaining} interview credits remaining`}
        className="inline-flex cursor-pointer select-none items-center rounded-full px-3 py-1 text-xs font-semibold text-white transition-none"
        style={{ background: bg }}
        onClick={() => setShowTooltip((v) => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={0}
      >
        {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} left
      </span>

      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg px-3 py-2 text-xs font-medium shadow-lg"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--card-border)',
          }}
          role="tooltip"
        >
          <p>Each interview uses 1 credit.</p>
          {paidActive && planExpiresAt ? (
            <p className="mt-1.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                {formatPlanTierName(planTier)}
              </span>
              {' · '}
              {expiryLine ?? planExpiresCopy(planExpiresAt, true)}
              <br />
              <span style={{ color: 'var(--text-muted)' }}>One-time 30-day access · renew manually</span>
            </p>
          ) : planTier === 'free' ? (
            <p className="mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Free lifetime credits — upgrade for 30-day access.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
