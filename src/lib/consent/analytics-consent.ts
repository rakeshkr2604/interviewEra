/**
 * Optional analytics consent — client storage contract.
 *
 * Essential auth (Supabase session cookies) and security controls are never
 * gated by this module. Only GA4, Microsoft Clarity, and Vercel Analytics /
 * Speed Insights should consult these helpers before initializing.
 */

export const ANALYTICS_CONSENT_STORAGE_KEY = 'ie_analytics_consent' as const;

/** Bump when consent copy or categories change materially. */
export const ANALYTICS_CONSENT_VERSION = '2026-10-09' as const;

export type AnalyticsConsentChoice = 'accepted' | 'rejected';

export type AnalyticsConsentRecord = {
  choice: AnalyticsConsentChoice;
  version: string;
  /** ISO-8601 timestamp when the preference was last set. */
  timestamp: string;
};

export function isAnalyticsConsentRecord(
  value: unknown,
): value is AnalyticsConsentRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    (record.choice === 'accepted' || record.choice === 'rejected') &&
    typeof record.version === 'string' &&
    record.version.length > 0 &&
    typeof record.timestamp === 'string' &&
    record.timestamp.length > 0
  );
}

export function createAnalyticsConsentRecord(
  choice: AnalyticsConsentChoice,
  version: string = ANALYTICS_CONSENT_VERSION,
  now: Date = new Date(),
): AnalyticsConsentRecord {
  return {
    choice,
    version,
    timestamp: now.toISOString(),
  };
}

export function parseAnalyticsConsentJson(
  raw: string | null | undefined,
): AnalyticsConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAnalyticsConsentRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readAnalyticsConsentFromStorage(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): AnalyticsConsentRecord | null {
  if (!storage) return null;
  try {
    return parseAnalyticsConsentJson(storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeAnalyticsConsentToStorage(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  record: AnalyticsConsentRecord,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearAnalyticsConsentFromStorage(
  storage: Pick<Storage, 'removeItem'> | null | undefined,
): void {
  if (!storage) return;
  try {
    storage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    // ignore quota / private-mode failures
  }
}

/** True only when the user explicitly accepted optional analytics. */
export function hasAcceptedAnalyticsConsent(
  record: AnalyticsConsentRecord | null | undefined,
): boolean {
  return record?.choice === 'accepted';
}

/**
 * Banner should show when there is no stored preference, or the stored
 * version is older than the current consent copy version.
 */
export function shouldPromptAnalyticsConsent(
  record: AnalyticsConsentRecord | null | undefined,
  currentVersion: string = ANALYTICS_CONSENT_VERSION,
): boolean {
  if (!record) return true;
  return record.version !== currentVersion;
}

export const ANALYTICS_CONSENT_EVENT = 'ie-analytics-consent-changed' as const;

export type AnalyticsConsentChangedDetail = {
  record: AnalyticsConsentRecord | null;
};

export function dispatchAnalyticsConsentChanged(
  record: AnalyticsConsentRecord | null,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<AnalyticsConsentChangedDetail>(ANALYTICS_CONSENT_EVENT, {
      detail: { record },
    }),
  );
}
