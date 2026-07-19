import { describe, expect, it } from 'vitest';
import { suggestDomainForRole } from './role-domain-map';

describe('suggestDomainForRole — exact matches', () => {
  it('maps the form chips to their domains', () => {
    expect(suggestDomainForRole('Software Engineer')).toBe('software engineering');
    expect(suggestDomainForRole('Product Manager')).toBe('product management');
    expect(suggestDomainForRole('Data Scientist')).toBe('data science');
    expect(suggestDomainForRole('Marketing Manager')).toBe('marketing');
    expect(suggestDomainForRole('Frontend Developer')).toBe('software engineering');
    expect(suggestDomainForRole('Business Analyst')).toBe('general');
  });

  it('maps the SEO catalogue engineering/data roles', () => {
    expect(suggestDomainForRole('Backend Developer')).toBe('software engineering');
    expect(suggestDomainForRole('Node.js Developer')).toBe('software engineering');
    expect(suggestDomainForRole('DevOps Engineer')).toBe('software engineering');
    expect(suggestDomainForRole('Data Analyst')).toBe('data science');
    expect(suggestDomainForRole('Machine Learning Engineer')).toBe('data science');
  });

  it('pins roles from unmapped SEO categories to general (no wrong forcing)', () => {
    expect(suggestDomainForRole('QA Engineer')).toBe('general');
    expect(suggestDomainForRole('System Analyst')).toBe('general');
    expect(suggestDomainForRole('UI/UX Designer')).toBe('general');
    expect(suggestDomainForRole('Cybersecurity Analyst')).toBe('general');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(suggestDomainForRole('  software   ENGINEER ')).toBe('software engineering');
  });
});

describe('suggestDomainForRole — keyword heuristic for free text', () => {
  it('routes engineering-flavoured titles to software engineering', () => {
    expect(suggestDomainForRole('Senior Backend Engineer')).toBe('software engineering');
    expect(suggestDomainForRole('SDE 2')).toBe('software engineering');
    expect(suggestDomainForRole('Golang Programmer')).toBe('software engineering');
  });

  it('prefers data science over the generic engineer rule', () => {
    expect(suggestDomainForRole('ML Engineer')).toBe('data science');
    expect(suggestDomainForRole('Machine Learning Intern')).toBe('data science');
    expect(suggestDomainForRole('Data Analytics Lead')).toBe('data science');
  });

  it('routes product and marketing titles', () => {
    expect(suggestDomainForRole('Associate Product Manager')).toBe('product management');
    expect(suggestDomainForRole('Growth Lead')).toBe('marketing');
    expect(suggestDomainForRole('SEO Specialist')).toBe('marketing');
  });
});

describe('suggestDomainForRole — no-match default', () => {
  it('defaults to general for unknown or empty input', () => {
    expect(suggestDomainForRole('')).toBe('general');
    expect(suggestDomainForRole('   ')).toBe('general');
    expect(suggestDomainForRole('Chartered Accountant')).toBe('general');
    expect(suggestDomainForRole('HR Executive')).toBe('general');
  });
});
