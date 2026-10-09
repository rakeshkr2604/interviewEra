'use client';

import { openAnalyticsConsentPreferences } from '@/components/consent/CookieConsentBanner';

/** Footer / settings control that reopens the analytics cookie banner. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      style={{ color: 'var(--text-secondary)' }}
      onClick={() => openAnalyticsConsentPreferences()}
    >
      Cookie settings
    </button>
  );
}
