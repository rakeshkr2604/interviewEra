import { describe, expect, it } from 'vitest';
import {
  PRIVACY_ACCEPTANCE_VERSION,
  TERMS_ACCEPTANCE_VERSION,
  buildSignupConsentPayload,
  encodeSignupConsentCookie,
  parseSignupConsentCookie,
} from './signup-consent';

describe('signup-consent', () => {
  it('round-trips a valid OAuth consent cookie', () => {
    const payload = buildSignupConsentPayload();
    const encoded = encodeSignupConsentCookie(payload);
    expect(parseSignupConsentCookie(encoded)).toEqual(payload);
  });

  it('rejects tampered or incomplete cookie payloads', () => {
    expect(parseSignupConsentCookie(undefined)).toBeNull();
    expect(parseSignupConsentCookie('not-json')).toBeNull();
    expect(
      parseSignupConsentCookie(
        encodeURIComponent(
          JSON.stringify({
            ageConfirmed: true,
            acceptedTerms: true,
            acceptedPrivacy: true,
            termsVersion: 'old',
            privacyVersion: PRIVACY_ACCEPTANCE_VERSION,
          }),
        ),
      ),
    ).toBeNull();
    expect(TERMS_ACCEPTANCE_VERSION).toBeTruthy();
  });
});
