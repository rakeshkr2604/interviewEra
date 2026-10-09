'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';
import { cn } from '@/lib/utils';

/**
 * Accessible optional-analytics consent banner.
 * Reject is as easy as Accept. Essential auth cookies are never controlled here.
 */
export function CookieConsentBanner() {
  const titleId = useId();
  const descriptionId = useId();
  const { ready, needsPrompt, setChoice, openPreferences } = useAnalyticsConsent();
  const [showDetails, setShowDetails] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready || !needsPrompt) return;
    const firstButton = panelRef.current?.querySelector<HTMLButtonElement>('button');
    firstButton?.focus();
  }, [ready, needsPrompt]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDetails) {
        setShowDetails(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDetails]);

  // Expose preference reopen for footer / settings without a global store.
  useEffect(() => {
    const onOpen = () => openPreferences();
    window.addEventListener('ie-open-analytics-consent', onOpen);
    return () => window.removeEventListener('ie-open-analytics-consent', onOpen);
  }, [openPreferences]);

  return (
    <>
      <div
        data-testid="ie-cookie-consent-mount"
        data-ready={ready ? '1' : '0'}
        data-needs-prompt={needsPrompt ? '1' : '0'}
        hidden
      />
      {ready && needsPrompt ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Analytics cookies"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-testid="ie-cookie-consent"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className={cn(
          'mx-auto max-w-3xl rounded-2xl border px-4 py-4 shadow-lg sm:px-5 sm:py-5',
        )}
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <h2 id={titleId} className="text-base font-semibold tracking-tight sm:text-lg">
          Analytics cookies
        </h2>
        <p
          id={descriptionId}
          className="mt-2 text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          We use optional analytics (Google Analytics, Microsoft Clarity, and Vercel Analytics)
          to understand product usage. Essential cookies for sign-in and security always stay on.
          You can change this anytime. Rejecting optional analytics is as easy as accepting.
          {' '}
          <Link
            href="/privacy#cookies"
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--accent-primary)' }}
          >
            Cookie details
          </Link>
        </p>

        {showDetails ? (
          <ul
            className="mt-3 list-disc space-y-1 pl-5 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Essential:</strong> Supabase Auth
              session cookies — required to stay signed in.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Preferences:</strong> theme
              (`ie-theme` in localStorage).
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Optional analytics:</strong> GA4,
              Clarity session insights, Vercel Analytics / Speed Insights — only after you accept.
            </li>
          </ul>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => setChoice('accepted')}
            className="ie-focus-visible inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--accent-primary-fg, #fff)',
            }}
          >
            Accept analytics
          </button>
          <button
            type="button"
            onClick={() => setChoice('rejected')}
            className="ie-focus-visible inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold"
            style={{
              borderColor: 'var(--card-border)',
              background: 'transparent',
              color: 'var(--text-primary)',
            }}
          >
            Reject analytics
          </button>
          <button
            type="button"
            onClick={() => setShowDetails((value) => !value)}
            className="ie-focus-visible inline-flex h-10 items-center justify-center rounded-xl px-3 text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
            aria-expanded={showDetails}
          >
            {showDetails ? 'Hide details' : 'Manage preferences'}
          </button>
        </div>
      </div>
    </div>
      ) : null}
    </>
  );
}

/** Programmatically reopen the banner (e.g. footer “Cookie settings”). */
export function openAnalyticsConsentPreferences(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('ie-open-analytics-consent'));
}
