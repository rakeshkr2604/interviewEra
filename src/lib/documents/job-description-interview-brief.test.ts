import { describe, expect, it } from 'vitest';
import { formatParsedJobDescriptionForInterview } from '@/lib/documents/job-description-interview-brief';
import type { ParsedJobDescription } from '@/types/app.types';

const sample: ParsedJobDescription = {
  role_title: 'Fresher Recruiter',
  company_employer: 'Appian Infotech',
  location: 'Remote',
  employment_type: 'Full-time',
  about_role: 'US IT recruitment exposure.',
  responsibilities: ['Source candidates', 'Screen profiles'],
  requirements: ['Strong communication'],
  must_have: ['English fluency'],
  nice_to_have: ['Prior internship'],
  skills_keywords: ['ATS', 'LinkedIn'],
  education_eligibility: ['Any graduate'],
  compensation_notes: '',
};

describe('job-description-interview-brief', () => {
  it('formats structured JD into briefing text', () => {
    const out = formatParsedJobDescriptionForInterview(sample);
    expect(out).toContain('Role: Fresher Recruiter');
    expect(out).toContain('Responsibilities:');
    expect(out).toContain('• Source candidates');
    expect(out).toContain('Skills / keywords:');
  });
});
