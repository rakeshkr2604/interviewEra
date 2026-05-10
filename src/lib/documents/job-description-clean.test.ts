import { describe, expect, it } from 'vitest';
import { extractJobDescriptionSubstance, refineJobDescriptionForUi } from '@/lib/documents/job-description-clean';

const APPIAN_EMAIL_JD = `Job Description for Placement Drive – Fresher Recruiter Position Hello Hope you are doing well. As discussed, please find the attached Job Description for the open position at Appian Infotech for the upcoming placement drive. We are looking to hire Fresher Recruiters for our US IT Recruitment team. This opportunity is ideal for recent graduates who are interested in starting their career in recruitment and gaining hands - on exposure to the US staffing industry. Kindly share the attached JD with the eligible students and let us know the availability of candidates for the placement process. Please feel free to`;

describe('job-description-clean', () => {
  it('removes email fluff and trailing placement instructions from Appian-style paste', () => {
    const out = extractJobDescriptionSubstance(APPIAN_EMAIL_JD);
    expect(out).not.toMatch(/Hope you are doing well/i);
    expect(out).not.toMatch(/Kindly share/i);
    expect(out).not.toMatch(/Please feel free/i);
    expect(out).toMatch(/We are looking to hire|Fresher Recruiters/i);
    expect(out).toMatch(/US IT Recruitment|recent graduates/i);
  });

  it('refineJobDescriptionForUi falls back to original when refine would be too short', () => {
    const tiny = 'Hello. ';
    expect(refineJobDescriptionForUi(tiny)).toBe('Hello.');
  });

  it('keeps structured sections when headings are present', () => {
    const raw = `Hello team,

About the role
Build APIs with Node.

Requirements
- 2 years experience
`;
    const out = extractJobDescriptionSubstance(raw);
    expect(out).not.toMatch(/^Hello team/i);
    expect(out).toMatch(/About the role/i);
    expect(out).toMatch(/Requirements/i);
  });
});
