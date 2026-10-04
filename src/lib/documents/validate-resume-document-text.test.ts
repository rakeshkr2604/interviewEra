import { describe, expect, it } from 'vitest';
import {
  validateJobDescriptionDocumentText,
  validateResumeDocumentText,
} from '@/lib/documents/validate-resume-document-text';

const VALID_RESUME = `
Jane Doe — Software Engineer
B.Tech Computer Science · CGPA 8.4
Work Experience
Intern at ACME — built APIs with Node.js
Technical skills: TypeScript, React, PostgreSQL
Education: Example University
`.trim();

const DAILY_ROUTINE_TRACKER = `
Daily Routine Tracker
Weekly Goal Tracker
Suggested Daily Schedule
Morning hydrate, exercise, breakfast
Afternoon focus work block
Evening wind down and journal
`.trim();

const CLEAR_JD = `
About the role
Key responsibilities: own the API roadmap, mentor juniors.
Requirements: 3 years of experience with distributed systems.
Must-have: PostgreSQL. Nice to have: Kubernetes.
`.trim();

describe('validateResumeDocumentText', () => {
  it('accepts a clear resume', () => {
    expect(validateResumeDocumentText(VALID_RESUME)).toEqual({ ok: true });
  });

  it('rejects a daily routine tracker', () => {
    const r = validateResumeDocumentText(DAILY_ROUTINE_TRACKER);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('WRONG_DOCUMENT_TYPE');
  });

  it('rejects a job description in the resume slot', () => {
    const r = validateResumeDocumentText(CLEAR_JD);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('WRONG_DOCUMENT_TYPE');
  });
});

describe('validateJobDescriptionDocumentText', () => {
  it('accepts a clear JD', () => {
    expect(validateJobDescriptionDocumentText(CLEAR_JD)).toEqual({ ok: true });
  });

  it('rejects a resume pasted into the JD slot', () => {
    const r = validateJobDescriptionDocumentText(VALID_RESUME);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('WRONG_JD_TYPE');
  });
});
