/**
 * QG preference profile — anonymous-first candidate preferences (Phase 2).
 *
 * Stored in localStorage for everyone (key: ie-qg-profile-v1, see
 * qg-profile-storage.ts) and mirrored into users.candidate_profile for
 * signed-in users via the existing /api/account/candidate-profile route.
 *
 * Level enums: candidate_profile.experience_level (fresher/junior/mid/senior)
 * is canonical (decision D2); the QG form's 3-bucket enum is a display/input
 * convenience mapped through the helpers below. The save-direction helper
 * implements a strict no-downgrade rule — a bug here would silently corrupt a
 * signed-in user's existing profile data, hence the unit tests next door.
 */

import { z } from 'zod';
import type { CandidateProfileFields } from '@/lib/candidate/types';
import { QG_DOMAINS, QG_LEVELS, type QgLevel } from './schemas';

export type CanonicalExperienceLevel = CandidateProfileFields['experienceLevel'];

export const qgPreferenceProfileSchema = z.object({
  profile_version: z.literal(1),
  role: z.string().trim().max(100).optional(),
  level: z.enum(QG_LEVELS).optional(),
  domain: z.enum(QG_DOMAINS).optional(),
  degree: z.string().trim().max(120).optional(),
  target_roles: z.array(z.string().trim().min(1).max(120)).max(5).optional(),
  target_companies: z.array(z.string().trim().min(1).max(120)).max(5).optional(),
});

export type QgPreferenceProfile = z.infer<typeof qgPreferenceProfileSchema>;

export const QG_PROFILE_VERSION = 1 as const;

/** Load direction (profile → QG form): canonical level to the 3-bucket form enum. */
export function mapCanonicalLevelToQgLevel(level: CanonicalExperienceLevel): QgLevel {
  switch (level) {
    case 'fresher':
      return 'fresher';
    case 'junior':
      return '1-3 years';
    case 'mid':
    case 'senior':
      return '3+ years';
  }
}

const QG_TO_CANONICAL: Record<QgLevel, CanonicalExperienceLevel> = {
  fresher: 'fresher',
  '1-3 years': 'junior',
  '3+ years': 'mid',
};

const CANONICAL_RANK: Record<CanonicalExperienceLevel, number> = {
  fresher: 0,
  junior: 1,
  mid: 2,
  senior: 3,
};

/**
 * Save direction (QG form → profile) with the D2 no-downgrade rule:
 * - No stored value → write the mapped value (fresher→fresher, 1-3 years→junior, 3+ years→mid).
 * - Stored value present → only move it upward (never downgrade `mid`/`senior`
 *   because the form's coarse `3+ years` bucket maps down to `mid`, and never
 *   downgrade `junior` to `fresher` from a narrower form selection).
 */
export function mapQgLevelToCanonicalLevel(
  qgLevel: QgLevel,
  currentCanonical: CanonicalExperienceLevel | null | undefined,
): CanonicalExperienceLevel {
  const mapped = QG_TO_CANONICAL[qgLevel];
  if (!currentCanonical) return mapped;
  return CANONICAL_RANK[mapped] > CANONICAL_RANK[currentCanonical] ? mapped : currentCanonical;
}

/** Parse a comma-separated multi-value input into the schema's max-5 string array. */
export function parseListInput(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 5);
}
