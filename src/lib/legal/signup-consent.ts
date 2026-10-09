/**
 * Signup age + Terms/Privacy acceptance — shared versions for UI + API.
 * Bump versions when material legal copy changes (also update privacy/terms dates).
 */

export const TERMS_ACCEPTANCE_VERSION = '2026-05-01' as const;
/** Align with privacyDocument.lastUpdated when material privacy copy changes. */
export const PRIVACY_ACCEPTANCE_VERSION = '2026-10-09' as const;

export const SIGNUP_CONSENT_COOKIE = 'ie_signup_consent' as const;
export const SIGNUP_CONSENT_COOKIE_MAX_AGE_SECONDS = 600;

export type SignupConsentPayload = {
  ageConfirmed: true;
  acceptedTerms: true;
  acceptedPrivacy: true;
  termsVersion: typeof TERMS_ACCEPTANCE_VERSION;
  privacyVersion: typeof PRIVACY_ACCEPTANCE_VERSION;
};

export function buildSignupConsentPayload(): SignupConsentPayload {
  return {
    ageConfirmed: true,
    acceptedTerms: true,
    acceptedPrivacy: true,
    termsVersion: TERMS_ACCEPTANCE_VERSION,
    privacyVersion: PRIVACY_ACCEPTANCE_VERSION,
  };
}

/** Serialize for a short-lived cookie bridging Google OAuth → auth callback. */
export function encodeSignupConsentCookie(payload: SignupConsentPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function parseSignupConsentCookie(
  raw: string | undefined | null,
): SignupConsentPayload | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Record<string, unknown>;
    if (
      value.ageConfirmed !== true ||
      value.acceptedTerms !== true ||
      value.acceptedPrivacy !== true ||
      value.termsVersion !== TERMS_ACCEPTANCE_VERSION ||
      value.privacyVersion !== PRIVACY_ACCEPTANCE_VERSION
    ) {
      return null;
    }
    return value as SignupConsentPayload;
  } catch {
    return null;
  }
}
