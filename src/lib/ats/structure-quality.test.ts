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
