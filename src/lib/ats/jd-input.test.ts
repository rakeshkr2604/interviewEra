import { describe, expect, it } from 'vitest';
import { ATS_JD_MAX_CHARS, precleanJdText } from '@/lib/ats/jd-input';

/**
 * Realistic full-page copy-paste: LinkedIn-style chrome around a long JD.
 * The body intentionally exceeds the OLD 4000-char cap so the test proves the
 * Qualifications / Nice-to-have tail now survives cleaning + the new limit.
 */
const RESPONSIBILITY_BULLETS = Array.from(
  { length: 18 },
  (_, i) =>
    `- Design, build and operate backend service number ${i + 1} handling high-volume traffic with strong reliability, observability and on-call ownership across the full lifecycle.`,
).join('\n');

const LINKEDIN_STYLE_JD = `
Sign in
Join now
We use cookies to improve your experience. Accept all cookies or manage preferences in cookie settings.
LinkedIn
Jobs
Software Engineer II — Backend
Acme Fintech Private Limited · Bengaluru, Karnataka, India (Hybrid)
Promoted
Actively hiring
Easy Apply
Save
Share
Show more

About the job
Acme Fintech is building payment infrastructure for 50M+ users across India. We process billions of transactions and share a culture of ownership: engineers apply judgment daily and save time through automation.

Responsibilities
${RESPONSIBILITY_BULLETS}

Qualifications (Required)
- Bachelor's or Master's degree in engineering or a related field
- Programming experience in at least one coding language such as Java, Python, or Go
- 3+ years of experience building distributed systems
- Strong knowledge of SQL and relational databases such as PostgreSQL
- Experience with REST API design and microservices

Nice to have
- Kubernetes and Docker in production
- Experience with Kafka or other event-streaming platforms
- Exposure to TypeScript and React for internal tooling
- Prior fintech or payments-domain experience

What we offer
Competitive compensation, ESOPs, comprehensive health insurance for you and your family, and a learning budget. Apply through the button above; our team will get back within 7 working days.

Set alert
Create job alert
Similar jobs
Senior Software Engineer, Payments — Bengaluru
PayCorp Technologies · ₹30L–₹45L
Easy Apply
Backend Developer — Java — Hyderabad
BigBank Tech · Promoted
People also viewed
Staff Engineer — Platform — Remote
`;

describe('precleanJdText', () => {
  const cleaned = precleanJdText(LINKEDIN_STYLE_JD);

  it('fixture is realistic: raw exceeds the old 4000-char cap', () => {
    expect(LINKEDIN_STYLE_JD.length).toBeGreaterThan(4000);
  });

  it('strips exact-line button/chrome text', () => {
    for (const junk of ['Easy Apply', 'Sign in', 'Join now', 'Promoted', 'Actively hiring', 'Set alert', 'Create job alert', 'Show more']) {
      expect(cleaned.split('\n')).not.toContain(junk);
    }
  });

  it('strips cookie-consent line', () => {
    expect(cleaned).not.toMatch(/We use cookies/i);
  });

  it('truncates trailing "Similar jobs" module', () => {
    expect(cleaned).not.toMatch(/Similar jobs/i);
    expect(cleaned).not.toMatch(/PayCorp/);
    expect(cleaned).not.toMatch(/People also viewed/i);
  });

  it('preserves every real requirement, including sentences containing pattern words', () => {
    expect(cleaned).toMatch(/Bachelor's or Master's degree in engineering/);
    expect(cleaned).toMatch(/Programming experience in at least one coding language/);
    expect(cleaned).toMatch(/Kubernetes and Docker in production/);
    // "share"/"apply"/"save" INSIDE sentences must survive (exact-line match only)
    expect(cleaned).toMatch(/share a culture of ownership/);
    expect(cleaned).toMatch(/engineers apply judgment daily/);
    expect(cleaned).toMatch(/save time through automation/);
    expect(cleaned).toMatch(/Apply through the button above/);
  });

  it('keeps the Qualifications tail inside the new char budget', () => {
    const sliced = cleaned.slice(0, ATS_JD_MAX_CHARS);
    expect(sliced).toMatch(/Nice to have/);
    expect(sliced).toMatch(/Exposure to TypeScript and React/);
  });

  it('is idempotent', () => {
    expect(precleanJdText(cleaned)).toBe(cleaned);
  });

  it('normalizes whitespace: CRLF, nbsp, zero-width chars, repeated blank lines', () => {
    const messy = 'Line one\r\n\r\n\r\n\r\nLine two with​zero width';
    expect(precleanJdText(messy)).toBe('Line one\n\nLine two withzero width');
  });

  it('does not drop a long paragraph that merely mentions cookies (300-char guard)', () => {
    const para = `Our platform team builds the consent service that renders the cookie policy page for millions of users; you will own its API. ${'x'.repeat(200)}`;
    expect(precleanJdText(para)).toBe(para);
  });
});

describe('ATS_JD_MAX_CHARS', () => {
  it('is 10000 (frontend, action, and prompt slice all import this)', () => {
    expect(ATS_JD_MAX_CHARS).toBe(10_000);
  });
});
