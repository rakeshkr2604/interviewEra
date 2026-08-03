/**
 * Degree-level matching for JD education requirements.
 * Client-safe, pure string work.
 *
 * Philosophy: JDs almost always say "…or a related field", and Indian degree
 * naming is diverse (MCA, B.Tech, BE, BSc, M.Sc, …). We enforce LEVEL, not
 * discipline — a Master of Computer Applications satisfies "Bachelor's or
 * Master's degree in engineering or a related field". A false "missing
 * required degree" is worse for users than a lenient pass.
 */

import type { ExtractedEducation } from '@/lib/ats/types';

export type DegreeLevel = 'diploma' | 'bachelor' | 'master' | 'phd';

const LEVEL_RANK: Record<DegreeLevel, number> = {
  diploma: 1,
  bachelor: 2,
  master: 3,
  phd: 4,
};

/** Pattern → level, checked in order (PhD before master: "doctor of philosophy"). */
const DEGREE_PATTERNS: ReadonlyArray<readonly [RegExp, DegreeLevel]> = [
  [/\b(ph\.?\s?d|doctor(ate)?( of philosophy)?|d\.?phil)\b/i, 'phd'],
  [
    /\b(master(s|'s)?|m\.?\s?tech|m\.?\s?e\b|m\.?\s?sc?|mca|mba|m\.?\s?com|m\.?\s?a\b|m\.?\s?s\b|pgdm|post\s?graduat(e|ion))\b/i,
    'master',
  ],
  [
    /\b(bachelor(s|'s)?|b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc?|bca|bba|b\.?\s?com|b\.?\s?a\b|b\.?\s?s\b|undergraduate degree|graduation)\b/i,
    'bachelor',
  ],
  [/\b(diploma|polytechnic)\b/i, 'diploma'],
];

/** Parse a free-form degree string ("Master of Computer Applications", "B.Tech CSE") to a level. */
export function degreeLevelFromText(text: string): DegreeLevel | null {
  const t = text.trim();
  if (!t) return null;
  for (const [re, level] of DEGREE_PATTERNS) {
    if (re.test(t)) return level;
  }
  return null;
}

/** Highest degree level found across a resume's education entries. */
export function highestDegreeLevel(education: readonly ExtractedEducation[]): DegreeLevel | null {
  let best: DegreeLevel | null = null;
  for (const e of education) {
    const level = e.degree ? degreeLevelFromText(e.degree) : null;
    if (level && (!best || LEVEL_RANK[level] > LEVEL_RANK[best])) best = level;
  }
  return best;
}

/**
 * Does the resume satisfy a JD's minimum degree level?
 * Higher levels satisfy lower requirements (a Master's covers "Bachelor's or
 * Master's"). Returns false when the resume has no parseable degree.
 */
export function meetsEducationRequirement(
  education: readonly ExtractedEducation[],
  minLevel: DegreeLevel,
): boolean {
  const have = highestDegreeLevel(education);
  return have != null && LEVEL_RANK[have] >= LEVEL_RANK[minLevel];
}

/** Display phrase for matched/missing chips, e.g. "bachelor's degree (computer science)". */
export function educationRequirementPhrase(
  minLevel: DegreeLevel,
  field: string | null,
): string {
  const base = minLevel === 'phd' ? 'PhD' : `${minLevel}'s degree`;
  return field ? `${base} (${field})` : base;
}
