import { z } from 'zod';
import type { CandidateProfileFields } from './types';

export const candidateProfileSchema = z.object({
  preferredRole: z.string().trim().min(1).max(120).optional(),
  graduationYear: z
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 6)
    .nullable()
    .optional(),
  collegeName: z.string().trim().max(200).optional(),
  experienceLevel: z.enum(['fresher', 'junior', 'mid', 'senior']).optional(),
});

export type CandidateProfilePatch = z.infer<typeof candidateProfileSchema>;

const storedProfileSchema = z.object({
  preferred_role: z.string().max(120).optional(),
  graduation_year: z.number().int().nullable().optional(),
  college_name: z.string().max(200).optional(),
  experience_level: z.enum(['fresher', 'junior', 'mid', 'senior']).optional(),
});

export function parseStoredCandidateProfile(raw: unknown): Partial<CandidateProfileFields> {
  const parsed = storedProfileSchema.safeParse(raw);
  if (!parsed.success) return {};
  const d = parsed.data;
  return {
    ...(d.preferred_role != null ? { preferredRole: d.preferred_role } : {}),
    ...(d.graduation_year !== undefined ? { graduationYear: d.graduation_year } : {}),
    ...(d.college_name != null ? { collegeName: d.college_name } : {}),
    ...(d.experience_level != null ? { experienceLevel: d.experience_level } : {}),
  };
}

export function mergeCandidateProfile(
  base: CandidateProfileFields,
  patch: CandidateProfilePatch,
): CandidateProfileFields {
  return {
    preferredRole: patch.preferredRole?.trim() || base.preferredRole,
    graduationYear: patch.graduationYear !== undefined ? patch.graduationYear : base.graduationYear,
    collegeName: patch.collegeName?.trim() ?? base.collegeName,
    experienceLevel: patch.experienceLevel ?? base.experienceLevel,
  };
}

export function profileToStorage(profile: CandidateProfileFields): Record<string, unknown> {
  return {
    preferred_role: profile.preferredRole,
    graduation_year: profile.graduationYear,
    college_name: profile.collegeName,
    experience_level: profile.experienceLevel,
  };
}

export function experienceLevelFromYears(years: number): CandidateProfileFields['experienceLevel'] {
  if (years <= 0) return 'fresher';
  if (years <= 2) return 'junior';
  if (years <= 5) return 'mid';
  return 'senior';
}

export function defaultCandidateProfile(input: {
  role?: string;
  experienceYears?: number;
  collegeName?: string | null;
}): CandidateProfileFields {
  return {
    preferredRole: input.role?.trim() || 'Software Engineer',
    graduationYear: null,
    collegeName: input.collegeName?.trim() || '',
    experienceLevel: experienceLevelFromYears(input.experienceYears ?? 0),
  };
}
