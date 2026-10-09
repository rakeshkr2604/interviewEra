import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_CONSENT_VERSION,
  createAnalyticsConsentRecord,
  hasAcceptedAnalyticsConsent,
  isAnalyticsConsentRecord,
  parseAnalyticsConsentJson,
  shouldPromptAnalyticsConsent,
} from './analytics-consent';

describe('analytics-consent', () => {
  it('creates a versioned timestamped record', () => {
    const record = createAnalyticsConsentRecord('accepted', 'v-test', new Date('2026-10-09T12:00:00.000Z'));
    expect(record).toEqual({
      choice: 'accepted',
      version: 'v-test',
      timestamp: '2026-10-09T12:00:00.000Z',
    });
  });

  it('rejects malformed storage payloads', () => {
    expect(parseAnalyticsConsentJson('not-json')).toBeNull();
    expect(parseAnalyticsConsentJson('{"choice":"accepted"}')).toBeNull();
    expect(isAnalyticsConsentRecord({ choice: 'maybe', version: '1', timestamp: 'x' })).toBe(false);
  });

  it('accepts only explicit accepted choice for analytics enablement', () => {
    expect(hasAcceptedAnalyticsConsent(null)).toBe(false);
    expect(hasAcceptedAnalyticsConsent(createAnalyticsConsentRecord('rejected'))).toBe(false);
    expect(hasAcceptedAnalyticsConsent(createAnalyticsConsentRecord('accepted'))).toBe(true);
  });

  it('prompts when missing or version-stale', () => {
    expect(shouldPromptAnalyticsConsent(null)).toBe(true);
    const current = createAnalyticsConsentRecord('accepted', ANALYTICS_CONSENT_VERSION);
    expect(shouldPromptAnalyticsConsent(current)).toBe(false);
    expect(
      shouldPromptAnalyticsConsent(createAnalyticsConsentRecord('accepted', 'old-version')),
    ).toBe(true);
  });
});
