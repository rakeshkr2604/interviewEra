import { describe, expect, it } from 'vitest';
import { enrichParsedJobDescriptionFromRaw, isJdPlaceholderScalar } from '@/lib/documents/enrich-parsed-job-description';
import type { ParsedJobDescription } from '@/types/app.types';

const empty = (): ParsedJobDescription => ({
  role_title: 'Fresher Recruiter',
  company_employer: 'Not specified',
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
});

describe('enrichParsedJobDescriptionFromRaw', () => {
  it('extracts company from “open position at X for the” phrasing', () => {
    const raw =
      'Please find the attached Job Description for the open position at Appian Infotech for the upcoming placement drive.';
    const o = empty();
    const r = enrichParsedJobDescriptionFromRaw(raw, o);
    expect(r.company_employer).toBe('Appian Infotech');
  });

  it('does not overwrite an existing company', () => {
    const raw = 'position at WRONG for the';
    const o = { ...empty(), company_employer: 'Acme Corp' };
    expect(enrichParsedJobDescriptionFromRaw(raw, o).company_employer).toBe('Acme Corp');
  });

  it('isJdPlaceholderScalar detects common fillers', () => {
    expect(isJdPlaceholderScalar('Not specified')).toBe(true);
    expect(isJdPlaceholderScalar('Appian')).toBe(false);
  });
});
