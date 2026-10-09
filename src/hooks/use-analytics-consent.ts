'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_CONSENT_VERSION,
  type AnalyticsConsentChoice,
  type AnalyticsConsentRecord,
  createAnalyticsConsentRecord,
  dispatchAnalyticsConsentChanged,
  hasAcceptedAnalyticsConsent,
  readAnalyticsConsentFromStorage,
  shouldPromptAnalyticsConsent,
  writeAnalyticsConsentToStorage,
} from '@/lib/consent/analytics-consent';

export type UseAnalyticsConsentResult = {
  /** True after the first client effect reads localStorage. */
  ready: boolean;
  record: AnalyticsConsentRecord | null;
  analyticsAllowed: boolean;
  needsPrompt: boolean;
  setChoice: (choice: AnalyticsConsentChoice) => void;
  openPreferences: () => void;
};

/**
 * Reads / writes optional analytics consent in localStorage and syncs across
 * same-tab listeners via a CustomEvent (and across tabs via `storage`).
 *
 * Intentionally starts `ready=false` on both server and first client paint so
 * SSR HTML matches hydration, then reveals the banner after mount.
 */
export function useAnalyticsConsent(): UseAnalyticsConsentResult {
  const [ready, setReady] = useState(false);
  const [record, setRecord] = useState<AnalyticsConsentRecord | null>(null);
  const [forcePrompt, setForcePrompt] = useState(false);

  useEffect(() => {
    const sync = () => {
      setRecord(readAnalyticsConsentFromStorage(window.localStorage));
      setReady(true);
    };

    sync();

    const onStorage = (event: StorageEvent) => {
      if (event.key === ANALYTICS_CONSENT_STORAGE_KEY || event.key === null) {
        sync();
      }
    };
    const onConsent = () => sync();

    window.addEventListener('storage', onStorage);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
    };
  }, []);

  const setChoice = useCallback((choice: AnalyticsConsentChoice) => {
    const next = createAnalyticsConsentRecord(choice, ANALYTICS_CONSENT_VERSION);
    writeAnalyticsConsentToStorage(window.localStorage, next);
    setRecord(next);
    setForcePrompt(false);
    dispatchAnalyticsConsentChanged(next);
  }, []);

  const openPreferences = useCallback(() => {
    setForcePrompt(true);
  }, []);

  const needsPrompt =
    forcePrompt || (ready && shouldPromptAnalyticsConsent(record, ANALYTICS_CONSENT_VERSION));

  return {
    ready,
    record,
    analyticsAllowed: hasAcceptedAnalyticsConsent(record),
    needsPrompt,
    setChoice,
    openPreferences,
  };
}
