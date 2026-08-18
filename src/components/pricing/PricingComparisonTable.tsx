'use client';

/**
 * Plan feature matrix — single card (semantic <table>, one DOM for mobile + desktop).
 * Row data: src/lib/pricing/tiers.ts. Styles: .ie-cmp-* in marketing.css.
 */

import { Check, X } from 'lucide-react';
import { PRICING_COMPARISON, type ComparisonValue } from '@/lib/pricing/tiers';

const COMPARISON_PLANS = [
  { id: 'free', label: 'Free', tone: 'muted' },
  { id: 'starter', label: 'Starter', tone: 'accent' },
  { id: 'pro', label: 'Pro', tone: 'success', highlight: true },
] as const;

function ComparisonCell({ value, highlight }: { value: ComparisonValue; highlight?: boolean }) {
  if (value === 'included') {
    return (
      <>
        <Check className="ie-cmp-icon" aria-hidden />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === 'not_included') {
    return (
      <>
        <X className="ie-cmp-icon ie-cmp-icon--off" aria-hidden />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span className={highlight ? 'ie-cmp-value ie-cmp-value--hl' : 'ie-cmp-value'}>{value}</span>;
}

export function PricingComparisonTable() {
  const rows = PRICING_COMPARISON;

  return (
    <div className="ie-cmp">
      <table className="ie-cmp-table">
        <caption className="sr-only">InterviewEra plan feature comparison</caption>
        <colgroup>
          <col style={{ width: '40%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">What you get</th>
            {COMPARISON_PLANS.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                data-hl={'highlight' in plan && plan.highlight ? '' : undefined}
              >
                <span className={`ie-cmp-plan-pill ie-cmp-plan-pill--${plan.tone}`}>
                  {plan.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature}>
              <th scope="row">{row.feature}</th>
              {COMPARISON_PLANS.map((plan) => {
                const highlight = 'highlight' in plan && plan.highlight;
                return (
                  <td key={plan.id} data-hl={highlight ? '' : undefined}>
                    <ComparisonCell value={row[plan.id]} highlight={highlight} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
