import {
  QG_PROFILE_VERSION,
  qgPreferenceProfileSchema,
  type QgPreferenceProfile,
} from '@/lib/question-engine/preference-profile';

// v1: role/level/domain + degree/target_roles/target_companies.
// Unknown keys are stripped by the schema so v1 readers tolerate future additions.
export const QG_PROFILE_STORAGE_KEY = 'ie-qg-profile-v1';

/** "Save across devices" signup CTA dismissed (signed-out users). */
export const QG_PROFILE_CTA_DISMISSED_KEY = 'ie-qg-profile-cta-dismissed-v1';

/** One-time "save this to your account" sync prompt dismissed (signed-in users). */
export const QG_PROFILE_SYNC_DISMISSED_KEY = 'ie-qg-profile-sync-dismissed-v1';

export function getLocalProfile(): QgPreferenceProfile | null {
  try {
    const raw = window.localStorage.getItem(QG_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = qgPreferenceProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function setLocalProfile(
  profile: Omit<QgPreferenceProfile, 'profile_version'>,
): QgPreferenceProfile | null {
  const versioned: QgPreferenceProfile = { ...profile, profile_version: QG_PROFILE_VERSION };
  try {
    window.localStorage.setItem(QG_PROFILE_STORAGE_KEY, JSON.stringify(versioned));
    return versioned;
  } catch {
    return null;
  }
}

export function isProfileFlagSet(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function setProfileFlag(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Storage blocked — the prompt will simply reappear next visit.
  }
}
