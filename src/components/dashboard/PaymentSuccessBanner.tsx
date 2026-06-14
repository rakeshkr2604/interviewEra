'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPlanExpiryEnIn } from '@/lib/pricing/copy';
import { PAID_PLANS, isPaidPlanId } from '@/lib/pricing/plans';

type PaymentSuccessData = {
  plan: 'starter' | 'pro';
  expiresAt: string | null;
  credits: number;
};

function parsePaymentSuccess(searchParams: URLSearchParams): PaymentSuccessData | null {
  const planParam = searchParams.get('upgraded');
  if (!planParam || !isPaidPlanId(planParam)) return null;

  const expires = searchParams.get('expires');
  let expiresAt: string | null = null;
  if (expires) {
    try {
      expiresAt = decodeURIComponent(expires);
    } catch {
      expiresAt = expires;
    }
  }

  const creditsParam = searchParams.get('credits');
  let credits = PAID_PLANS[planParam].credits;
  if (creditsParam) {
    const parsed = Number.parseInt(creditsParam, 10);
    if (!Number.isNaN(parsed)) credits = parsed;
  }

  return { plan: planParam, expiresAt, credits };
}

export function PaymentSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const parsed = parsePaymentSuccess(searchParams);
  const [bannerData, setBannerData] = useState<PaymentSuccessData | null>(null);

  if (parsed !== null && bannerData === null) {
    setBannerData(parsed);
  }

  useEffect(() => {
    if (!bannerData) return;

    const url = new URL(window.location.href);
    if (
      !url.searchParams.has('upgraded') &&
      !url.searchParams.has('expires') &&
      !url.searchParams.has('credits')
    ) {
      return;
    }

    url.searchParams.delete('upgraded');
    url.searchParams.delete('expires');
    url.searchParams.delete('credits');
    router.replace(url.pathname + (url.search ? url.search : ''), { scroll: false });
  }, [bannerData, router]);

  if (dismissed || !bannerData) return null;

  const planName = PAID_PLANS[bannerData.plan].label;
  const expiryLabel = bannerData.expiresAt ? formatPlanExpiryEnIn(bannerData.expiresAt) : null;

  return (
    <div
      className="mb-6 rounded-[14px] border-2 px-4 py-4 sm:px-6 sm:py-5"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-success) 35%, var(--card-border))',
        background: 'color-mix(in srgb, var(--accent-success) 8%, var(--card-bg))',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Check
          className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Payment successful
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Current plan
              </dt>
              <dd className="mt-0.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                {planName}
              </dd>
            </div>
            {expiryLabel ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Expiry date
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {expiryLabel}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Credits
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {bannerData.credits}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => setDismissed(true)}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
