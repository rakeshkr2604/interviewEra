import type { ParsedJobDescription } from '@/types/app.types';
import { isJdPlaceholderScalar } from '@/lib/documents/enrich-parsed-job-description';
import { safeText } from '@/lib/utils/sanitize';

const MAX = {
  short: 400,
  line: 2000,
  about: 6000,
  comp: 800,
} as const;

function scalarOrEmpty(s: string, max: number): string {
  const t = s.trim();
  if (isJdPlaceholderScalar(t)) return '';
  return safeText(t, max);
}

export function sanitizeParsedJobDescription(input: ParsedJobDescription): ParsedJobDescription {
  const lines = (xs: string[]) => xs.map((s) => safeText(s, MAX.line));

  return {
    role_title: safeText(input.role_title, MAX.short),
    company_employer: scalarOrEmpty(input.company_employer, MAX.short),
    location: scalarOrEmpty(input.location, MAX.short),
    employment_type: scalarOrEmpty(input.employment_type, 120),
    about_role: safeText(input.about_role, MAX.about),
    responsibilities: lines(input.responsibilities),
    requirements: lines(input.requirements),
    must_have: lines(input.must_have),
    nice_to_have: lines(input.nice_to_have),
    skills_keywords: input.skills_keywords.map((s) => safeText(s, 120)),
    education_eligibility: lines(input.education_eligibility),
    compensation_notes: scalarOrEmpty(input.compensation_notes, MAX.comp),
  };
}
