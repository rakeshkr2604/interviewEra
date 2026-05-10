import { describe, expect, it } from 'vitest';
import { jobDescriptionSummaryLine } from '@/lib/onboarding/job-description-summary-line';
import type { ParsedJobDescription } from '@/types/app.types';

const empty = (over: Partial<ParsedJobDescription>): ParsedJobDescription => ({
  role_title: '',
  company_employer: '',
  location: '',
  employment_type: '',
  about_role: '',
  responsibilities: [],
  requirements: [],
  must_have: [],
  nice_to_have: [],
  skills_keywords: [],
  education_eligibility: [],
  compensation_notes: '',
  ...over,
});

describe('jobDescriptionSummaryLine', () => {
  it('includes title and section counts when present', () => {
    const s = jobDescriptionSummaryLine(
      empty({
        role_title: 'Fresher Recruiter',
        responsibilities: ['a', 'b'],
        requirements: ['c'],
        skills_keywords: ['x'],
      }),
    );
    expect(s).toContain('Fresher Recruiter');
    expect(s).toContain('2 role focus areas');
    expect(s).toContain('1 requirement');
    expect(s).toContain('1 skill keyword');
  });
});
