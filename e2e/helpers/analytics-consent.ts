import type { Page } from '@playwright/test';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_CONSENT_VERSION,
  createAnalyticsConsentRecord,
  type AnalyticsConsentChoice,
} from '@/lib/consent/analytics-consent';

/**
 * Seed analytics consent before navigation so the cookie banner does not
 * intercept clicks on forms under test. Cookie-consent.spec.ts owns banner UX.
 */
export async function seedAnalyticsConsent(
  page: Page,
  choice: AnalyticsConsentChoice = 'rejected',
): Promise<void> {
  const record = createAnalyticsConsentRecord(choice, ANALYTICS_CONSENT_VERSION);
  await page.addInitScript(
    ({ consentKey, consentRecord }) => {
      try {
        localStorage.setItem(consentKey, JSON.stringify(consentRecord));
      } catch {
        /* ignore */
      }
    },
    { consentKey: ANALYTICS_CONSENT_STORAGE_KEY, consentRecord: record },
  );
}
