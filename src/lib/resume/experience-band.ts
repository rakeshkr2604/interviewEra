/**
 * Experience-band refinement for interview personalization.
 * Internships / traineeships must not inflate professional year bands.
 */

import type { ResumeExperienceEntry } from '@/types/app.types';

const INTERNSHIP_TITLE_RE =
  /\b(?:intern(?:ship)?|trainee|apprentice|co[\s-]?op|industrial\s+training)\b/i;

/** True when the role is internship/trainee-class (not full-time professional). */
export function isInternshipExperienceEntry(entry: ResumeExperienceEntry): boolean {
  const blob = `${entry.title} ${entry.organization}`.trim();
  if (!blob) return false;
  return INTERNSHIP_TITLE_RE.test(blob);
}

export function professionalExperienceEntries(
  experience: ResumeExperienceEntry[] | undefined,
): ResumeExperienceEntry[] {
  if (!Array.isArray(experience) || experience.length === 0) return [];
  return experience.filter((e) => !isInternshipExperienceEntry(e));
}

/**
 * Clamp / correct LLM or heuristic bands using structured experience entries.
 * - Exclusively internships (or empty after filtering) → "0-1 years"
 * - Mixed / full-time present → keep the provided estimate (LLM/heuristic)
 */
export function refineExperienceEstimate(
  estimate: string,
  experience: ResumeExperienceEntry[] | undefined,
): string {
  const trimmed = (estimate || '').trim() || 'Not specified';
  if (!Array.isArray(experience) || experience.length === 0) {
    return trimmed;
  }

  const professional = professionalExperienceEntries(experience);
  if (professional.length === 0) {
    // Internship-only (or trainee-only) → fresher band
    return '0-1 years';
  }

  return trimmed;
}
