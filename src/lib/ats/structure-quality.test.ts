import { describe, expect, it } from 'vitest';
import { analyzeStructureQuality, parseYearHint } from '@/lib/ats/structure-quality';
import { scoreFieldExtraction } from '@/lib/ats/field-extraction';
import { buildActionItems } from '@/lib/ats/action-items';
import type { ExtractedResumeData } from '@/lib/ats/types';

const rich: ExtractedResumeData = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+1 555 0100',
  linkedin: 'linkedin.com/in/ada',
  location: 'London',
  experience: [
    { company: 'Analytical Engines', title: 'Engineer', startDate: '2022', endDate: 'Present' },
    { company: 'Math Inst', title: 'Researcher', startDate: '2018', endDate: '2021' },
  ],
  education: [{ institution: 'Cambridge', degree: 'BSc', year: '2018' }],
  skills: ['Mathematics', 'Programming'],
};

describe('structure + field scoring', () => {
  it('scores a complete extract highly', () => {
    const fields = scoreFieldExtraction(rich);
    expect(fields.score).toBe(100);
    expect(fields.missingFields).toEqual([]);

    const structure = analyzeStructureQuality(rich, 'word '.repeat(300));
    expect(structure.score).toBeGreaterThanOrEqual(85);
  });

  it('detects non reverse-chrono experience', () => {
    const bad: ExtractedResumeData = {
      ...rich,
      experience: [
        { company: 'Old Co', title: 'Intern', startDate: '2015', endDate: '2016' },
        { company: 'New Co', title: 'Lead', startDate: '2022', endDate: '2024' },
      ],
    };
    const structure = analyzeStructureQuality(bad, 'word '.repeat(300));
    expect(structure.findings.some((f) => f.id === 'not_reverse_chrono')).toBe(true);
  });

  it('parseYearHint understands present', () => {
    expect(parseYearHint('Present')).toBe(9999);
    expect(parseYearHint('Jan 2020 – Mar 2022')).toBe(2022);
  });

  it('flags insufficient-dates-for-chronology as a warning (not silent info) — the 90/100 case', () => {
    // Reproduces the live-UI report: hasExp/hasEdu/hasSkills all true (25+20+20=65),
    // only ONE dated experience entry so chronology can't be verified (+10 of 20
    // instead of full 20), 200-1200 words (+15) -> 65+10+15 = 90.
    const oneRoleNoChrono: ExtractedResumeData = {
      ...rich,
      experience: [{ company: 'Analytical Engines', title: 'Engineer', startDate: '2022', endDate: 'Present' }],
    };
    const structure = analyzeStructureQuality(oneRoleNoChrono, 'word '.repeat(300));
    expect(structure.score).toBe(90);

    const chronoFinding = structure.findings.find((f) => f.id === 'chrono_insufficient_dates');
    expect(chronoFinding).toBeDefined();
    // This is the actual bug: severity must be 'warning' so DimensionCard's
    // unconditional `issues` bucket renders it — 'info' findings are silently
    // capped at the first 2 and this one would never make the cut.
    expect(chronoFinding!.severity).toBe('warning');
    expect(chronoFinding!.message).toMatch(/10 of 20 points/);

    // Simulates AtsResultsView's DimensionCard split: issues (non-info) render
    // unconditionally; info renders only its first 2. The deduction reason
    // must land in `issues`, not get lost in the info truncation.
    const issues = structure.findings.filter((f) => f.severity !== 'info');
    expect(issues.some((f) => f.id === 'chrono_insufficient_dates')).toBe(true);
  });

  it('flags an over-length resume as a warning (not silent info)', () => {
    const longResume: ExtractedResumeData = {
      ...rich, // 2 dated roles, reverse-chrono -> full chronology credit
    };
    const structure = analyzeStructureQuality(longResume, 'word '.repeat(1500));
    const lengthFinding = structure.findings.find((f) => f.id === 'length_long');
    expect(lengthFinding).toBeDefined();
    expect(lengthFinding!.severity).toBe('warning');
    expect(lengthFinding!.message).toMatch(/10 of 15 points/);

    const issues = structure.findings.filter((f) => f.severity !== 'info');
    expect(issues.some((f) => f.id === 'length_long')).toBe(true);
  });

  it('builds action items from findings without LLM copy', () => {
    const items = buildActionItems({
      parseabilityFindings: [
        {
          id: 'multi_column',
          severity: 'error',
          message: 'Multi-column',
        },
      ],
      structureFindings: [
        {
          id: 'missing_skills',
          severity: 'warning',
          message: 'No skills',
        },
      ],
      missingFields: ['email'],
    });
    expect(items[0]?.priority).toBe('high');
    expect(items.some((i) => /single-column/i.test(i.text))).toBe(true);
    expect(items.some((i) => /email/i.test(i.text))).toBe(true);
  });
});
