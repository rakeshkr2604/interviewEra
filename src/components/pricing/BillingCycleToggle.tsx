'use client';

import { cn } from '@/lib/utils';

export type BillingCycle = 'monthly' | 'annual';

export function BillingCycleToggle({
  value,
  onChange,
  id = 'billing-cycle',
  variant = 'default',
}: {
  value: BillingCycle;
  onChange: (next: BillingCycle) => void;
  id?: string;
  /** Readable on indigo/navy pricing band */
  variant?: 'default' | 'onNavy';
}) {
  const isAnnual = value === 'annual';
  const navy = variant === 'onNavy';

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-3"
      role="group"
      aria-label="Billing cycle"
    >
      <span
        className={cn(
          'text-sm font-medium transition-opacity',
          navy && (isAnnual ? 'text-slate-400' : 'text-white'),
        )}
        style={navy ? undefined : { color: isAnnual ? 'var(--text-secondary)' : 'var(--text-primary)' }}
      >
        Monthly
      </span>
      <button
        type="button"
        id={`${id}-switch`}
        role="switch"
        aria-checked={isAnnual}
        aria-label={isAnnual ? 'Switch to monthly billing' : 'Switch to annual billing'}
        onClick={() => onChange(isAnnual ? 'monthly' : 'annual')}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          navy
            ? cn(
                'focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950',
                isAnnual ? 'border-indigo-400 bg-indigo-500' : 'border-white/25 bg-white/10',
              )
            : cn(
                'focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-[var(--bg-primary)]',
                isAnnual
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                  : 'border-[var(--card-border)] bg-[var(--bg-tertiary)]',
              ),
        )}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            isAnnual ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span
        className={cn(
          'text-sm font-medium transition-opacity',
          navy && (isAnnual ? 'text-white' : 'text-slate-400'),
        )}
        style={navy ? undefined : { color: isAnnual ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        Annual{' '}
        <span
          className={cn(
            'ml-1 rounded-md px-2 py-0.5 text-xs font-semibold',
            navy
              ? 'bg-emerald-500/20 text-emerald-200'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
          )}
        >
          Save 33%
        </span>
      </span>
    </div>
  );
}
