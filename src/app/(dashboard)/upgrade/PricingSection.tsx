'use client';

import { useId, useState } from 'react';
import { Ticket } from 'lucide-react';
import { AppPricingGrid, type PromoPlanQuote } from '@/components/pricing/PricingTierGrid';
import { BillingCycleToggle, type BillingCycle } from '@/components/pricing/BillingCycleToggle';
import type { PlanTier } from '@/types/app.types';
import { PricingPageViewTracker } from '@/components/analytics/PricingPageViewTracker';
import type { PaidPlanId } from '@/lib/pricing/plans';

interface PricingSectionProps {
  currentPlan: PlanTier;
  userEmail: string;
  planExpiresAt?: string | null;
  planStatus?: string | null;
}

type PreviewJson = {
  ok?: boolean;
  error?: string;
  code?: string;
  label?: string;
  list_amount_paise?: number;
  discount_paise?: number;
  final_amount_paise?: number;
};

async function previewPlan(plan: PaidPlanId, code: string): Promise<PreviewJson & { plan: PaidPlanId }> {
  const res = await fetch('/api/payments/preview-discount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, code }),
  });
  const json = (await res.json()) as PreviewJson;
  return { ...json, plan, ok: res.ok && json.ok === true };
}

export function PricingSection({
  currentPlan,
  userEmail,
  planExpiresAt,
  planStatus,
}: PricingSectionProps) {
  // TEMPORARILY HIDDEN: annual billing toggle (2026-05-14) — cycle fixed to 'monthly'
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | undefined>();
  const [quotes, setQuotes] = useState<Partial<Record<PaidPlanId, PromoPlanQuote>>>({});
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const inputId = useId();
  const errorId = useId();

  async function applyCode() {
    const code = codeDraft.trim().toUpperCase();
    if (!code) {
      setInlineError('Enter a code');
      return;
    }
    setApplying(true);
    setInlineError(null);
    try {
      const [starter, pro] = await Promise.all([
        previewPlan('starter', code),
        previewPlan('pro', code),
      ]);

      const nextQuotes: Partial<Record<PaidPlanId, PromoPlanQuote>> = {};
      if (starter.ok && typeof starter.final_amount_paise === 'number') {
        nextQuotes.starter = {
          list_amount_paise: starter.list_amount_paise ?? 0,
          discount_paise: starter.discount_paise ?? 0,
          final_amount_paise: starter.final_amount_paise,
          label: starter.label ?? null,
        };
      }
      if (pro.ok && typeof pro.final_amount_paise === 'number') {
        nextQuotes.pro = {
          list_amount_paise: pro.list_amount_paise ?? 0,
          discount_paise: pro.discount_paise ?? 0,
          final_amount_paise: pro.final_amount_paise,
          label: pro.label ?? null,
        };
      }

      if (Object.keys(nextQuotes).length > 0) {
        setAppliedCode(code);
        setQuotes(nextQuotes);
        setCodeOpen(false);
        return;
      }

      // Plan-specific code that didn't match either preview path (or hard invalid).
      // CODE_NOT_APPLICABLE on both is rare; still pass code through to create-order.
      const hard =
        starter.code !== 'CODE_NOT_APPLICABLE' ? starter : pro.code !== 'CODE_NOT_APPLICABLE' ? pro : null;

      if (hard && !hard.ok && hard.code !== 'CODE_NOT_APPLICABLE') {
        setAppliedCode(undefined);
        setQuotes({});
        setInlineError(hard.error ?? 'Invalid code');
        return;
      }

      // Applicable at checkout for at least one plan — keep code, no card-level quote yet.
      setAppliedCode(code);
      setQuotes({});
      setCodeOpen(false);
    } catch {
      setInlineError('Could not validate code. Try again.');
    } finally {
      setApplying(false);
    }
  }

  function clearCode() {
    setCodeDraft('');
    setAppliedCode(undefined);
    setQuotes({});
    setInlineError(null);
    setCodeOpen(true);
  }

  return (
    <div className="dashboard-premium-card overflow-visible">
      <PricingPageViewTracker sourcePage="/upgrade" authenticated />
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
        <AppPricingGrid
          currentPlan={currentPlan}
          userEmail={userEmail}
          planExpiresAt={planExpiresAt}
          planStatus={planStatus}
          promoCode={appliedCode}
          promoQuotes={quotes}
          belowGrid={
            <div className="flex flex-col items-center text-center">
              {!codeOpen && !appliedCode && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium underline-offset-2 transition-[transform,text-decoration-color] duration-150 hover:scale-105 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] focus-visible:ring-offset-2 motion-reduce:transform-none"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-expanded={false}
                  aria-controls={inputId}
                  onClick={() => {
                    setCodeOpen(true);
                    setInlineError(null);
                  }}
                >
                  <Ticket className="size-3.5 shrink-0 opacity-80" aria-hidden />
                  Have a promo code?
                </button>
              )}

              {appliedCode && !codeOpen && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Code{' '}
                  <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {appliedCode}
                  </span>{' '}
                  applied
                  <button
                    type="button"
                    onClick={clearCode}
                    className="ml-2 underline underline-offset-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Remove
                  </button>
                </p>
              )}

              {codeOpen && (
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <label htmlFor={inputId} className="sr-only">
                      Promo or sponsorship code
                    </label>
                    <input
                      id={inputId}
                      type="text"
                      value={codeDraft}
                      onChange={(e) => {
                        setCodeDraft(e.target.value.toUpperCase());
                        if (inlineError) setInlineError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void applyCode();
                        }
                        if (e.key === 'Escape') {
                          setCodeOpen(false);
                          setInlineError(null);
                        }
                      }}
                      placeholder="Enter code"
                      maxLength={64}
                      autoComplete="off"
                      aria-invalid={inlineError ? true : undefined}
                      aria-describedby={inlineError ? errorId : undefined}
                      className="min-w-[10rem] flex-1 rounded-lg border px-3 py-2 text-sm font-mono uppercase"
                      style={{
                        borderColor: inlineError
                          ? 'color-mix(in srgb, #dc2626 55%, var(--card-border))'
                          : 'var(--card-border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void applyCode()}
                      disabled={applying}
                      className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                      style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                    >
                      {applying ? '…' : 'Apply'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCodeOpen(false);
                        setInlineError(null);
                        if (!appliedCode) setCodeDraft('');
                      }}
                      className="text-xs underline underline-offset-2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Cancel
                    </button>
                  </div>
                  {inlineError && (
                    <p
                      id={errorId}
                      role="alert"
                      className="text-xs"
                      style={{ color: '#dc2626' }}
                    >
                      {inlineError}
                    </p>
                  )}
                </div>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
