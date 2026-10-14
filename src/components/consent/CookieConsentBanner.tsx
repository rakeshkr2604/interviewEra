'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent';
import { cn } from '@/lib/utils';

/**
 * Accessible optional-analytics consent banner.
 * Reject is as easy as Accept. Essential auth cookies are never controlled here.
 *
 * Layout is intentionally compact: a tall dialog body was winning mobile LCP over
 * the hero poster (Loop 17 traces). Expanded details stay behind a toggle.
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
          className="fixed inset-x-0 bottom-0 z-[60] p-2 sm:p-3"
          style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div
            className={cn(
              'mx-auto max-w-3xl rounded-xl border px-3 py-2.5 shadow-lg sm:px-4 sm:py-3',
            )}
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-sm font-semibold tracking-tight">
                  Analytics cookies
                </h2>
                <p
                  id={descriptionId}
                  className="mt-0.5 text-[12px] leading-snug sm:text-[13px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Optional analytics only. Essential sign-in cookies stay on.{' '}
                  <Link
                    href="/privacy#cookies"
                    className="font-medium underline underline-offset-2"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Details
                  </Link>
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setChoice('accepted')}
                  className="ie-focus-visible inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold sm:text-sm"
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
                  className="ie-focus-visible inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold sm:text-sm"
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
                  className="ie-focus-visible inline-flex h-9 items-center justify-center rounded-lg px-2 text-xs font-medium sm:text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-expanded={showDetails}
                >
                  {showDetails ? 'Hide details' : 'Manage preferences'}
                </button>
              </div>
            </div>

            {showDetails ? (
              <ul
                className="mt-2 list-disc space-y-1 border-t pt-2 pl-5 text-[12px] leading-snug"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--card-border)' }}
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
