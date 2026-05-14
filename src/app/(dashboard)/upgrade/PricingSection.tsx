'use client';

import { useState } from 'react';
import { AppPricingGrid } from '@/components/pricing/PricingTierGrid';
import { BillingCycleToggle, type BillingCycle } from '@/components/pricing/BillingCycleToggle';
import type { PlanTier } from '@/types/app.types';

interface PricingSectionProps {
  currentPlan: PlanTier;
  userEmail: string;
}

export function PricingSection({ currentPlan, userEmail }: PricingSectionProps) {
  // TEMPORARILY HIDDEN: annual billing toggle (2026-05-14) — cycle fixed to 'monthly'
  // Annual plans still fully supported in backend; toggle hidden to defer annual repricing.
  // Uncomment setCycle and unwrap {false &&} to restore toggle.
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  return (
    <div className="dashboard-premium-card overflow-visible">
      {/* Billing toggle — TEMPORARILY HIDDEN (2026-05-14) — annual plans still supported in backend */}
      {false && (
        <div
          className="border-b-2 px-6 py-5 sm:px-8 sm:py-6"
          style={{
            borderColor: 'var(--card-border)',
            background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent)',
          }}
        >
          <p
            className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
            style={{ color: 'var(--accent-primary)' }}
          >
            Billing
          </p>
          <BillingCycleToggle value={cycle} onChange={setCycle} id="upgrade-billing" />
        </div>
      )}
      <div className="p-6 sm:p-8">
        <AppPricingGrid currentPlan={currentPlan} userEmail={userEmail} billingCycle={cycle} />
      </div>
    </div>
  );
}
