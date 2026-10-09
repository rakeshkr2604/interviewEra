import type { SupabaseClient } from '@supabase/supabase-js';
import type { SignupConsentPayload } from '@/lib/legal/signup-consent';

/**
 * Writes age/terms/privacy acceptance onto public.users.
 * Soft-fails if migration 114 columns are not yet applied (degrade-don't-fail).
 */
export async function persistSignupConsent(
  service: SupabaseClient,
  userId: string,
  consent: SignupConsentPayload,
  acceptedAt: Date = new Date(),
): Promise<{ ok: boolean; error?: string }> {
  const iso = acceptedAt.toISOString();
  const { error } = await service
    .from('users')
    .update({
      age_confirmed_at: iso,
      terms_accepted_at: iso,
      privacy_accepted_at: iso,
      terms_accepted_version: consent.termsVersion,
      privacy_accepted_version: consent.privacyVersion,
    })
    .eq('id', userId);

  if (error) {
    console.error('[signup-consent] persist failed:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
