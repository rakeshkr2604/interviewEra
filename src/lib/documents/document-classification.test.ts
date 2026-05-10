import { describe, expect, it } from 'vitest';
import {
  assertLooksLikeJobDescription,
  assertLooksLikeResume,
  classifyDocumentKind,
} from '@/lib/documents/document-classification';

const APPIAN_STYLE_JD_SNIPPET = `
Job Description for Placement Drive – Fresher Recruiter Position
Hello Hope you are doing well. As discussed, please find the attached Job Description
for the open position at Appian Infotech for the upcoming placement drive.
We are looking to hire Fresher Recruiters for our US IT Recruitment team.
This opportunity is ideal for recent graduates who are interested in starting their
career in recruitment. Kindly share the attached JD with students.
`.trim();

const OBVIOUS_RESUME = `
John Doe
B.Tech Computer Science • CGPA 8.2
Work Experience
Software Intern at ACME Corp — built REST APIs with Node.js
Technical skills: TypeScript, PostgreSQL, Docker
Languages known: English, Hindi
`.trim();

describe('document-classification', () => {
  it('classifies obvious resume', () => {
    expect(classifyDocumentKind(OBVIOUS_RESUME)).toBe('resume');
  });

  it('accepts Appian-style placement JD in JD validator', () => {
    const r = assertLooksLikeJobDescription(APPIAN_STYLE_JD_SNIPPET);
    expect(r).toEqual({ ok: true });
  });

  it('rejects resume pasted into JD validator when clearly resume-heavy', () => {
    const r = assertLooksLikeJobDescription(OBVIOUS_RESUME);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('resume');
  });

  it('accepts clear JD for job_description kind', () => {
    const jd = `
About the role
Key responsibilities: own the API roadmap, mentor juniors.
Requirements: 3 years of experience with distributed systems.
Must-have: PostgreSQL. Nice to have: Kubernetes.
    `.trim();
    expect(classifyDocumentKind(jd)).toBe('job_description');
    expect(assertLooksLikeJobDescription(jd)).toEqual({ ok: true });
  });

  it('balanced tie passes JD validator (user intent in JD box)', () => {
    const balanced =
      'We are hiring for a recruiter role. Graduates welcome. Team player wanted. ' +
      'Professional experience in sales is a plus.'.repeat(4);
    const kind = classifyDocumentKind(balanced);
    expect(kind).toBe('balanced');
    expect(assertLooksLikeJobDescription(balanced).ok).toBe(true);
  });

  it('long balanced text with no JD signals still fails JD validator', () => {
    const filler = 'Lorem ipsum dolor sit amet. Consectetur adipiscing elit. '.repeat(20);
    expect(assertLooksLikeJobDescription(filler).ok).toBe(false);
  });

  it('resume slot rejects JD-leaning balanced doc', () => {
    const balanced =
      'We are hiring for a recruiter role. Graduates welcome. Team player wanted. ' +
      'Professional experience in sales is a plus.'.repeat(4);
    const r = assertLooksLikeResume(balanced);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('job posting');
  });
});
