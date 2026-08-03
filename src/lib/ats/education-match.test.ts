import { describe, expect, it } from 'vitest';
import {
  degreeLevelFromText,
  educationRequirementPhrase,
  highestDegreeLevel,
  meetsEducationRequirement,
} from '@/lib/ats/education-match';
import type { ExtractedEducation } from '@/lib/ats/types';

function edu(degree: string | null): ExtractedEducation {
  return { institution: 'X', degree, year: null };
}

describe('degreeLevelFromText', () => {
  it('maps Indian and global degree names to levels', () => {
    expect(degreeLevelFromText('Master of Computer Applications')).toBe('master');
    expect(degreeLevelFromText('MCA')).toBe('master');
    expect(degreeLevelFromText('M.Tech in CSE')).toBe('master');
    expect(degreeLevelFromText('MBA')).toBe('master');
    expect(degreeLevelFromText('M.Sc Physics')).toBe('master');
    expect(degreeLevelFromText('B.Tech Computer Science')).toBe('bachelor');
    expect(degreeLevelFromText('BE (Mechanical)')).toBe('bachelor');
    expect(degreeLevelFromText('BCA')).toBe('bachelor');
    expect(degreeLevelFromText('Bachelor of Commerce')).toBe('bachelor');
    expect(degreeLevelFromText('B.Sc.')).toBe('bachelor');
    expect(degreeLevelFromText('PhD in Statistics')).toBe('phd');
    expect(degreeLevelFromText('Doctor of Philosophy')).toBe('phd');
    expect(degreeLevelFromText('Diploma in Electronics')).toBe('diploma');
    expect(degreeLevelFromText('Class XII / Senior Secondary')).toBe(null);
    expect(degreeLevelFromText('')).toBe(null);
  });
});

describe('highestDegreeLevel / meetsEducationRequirement', () => {
  it('picks the highest level across entries', () => {
    expect(
      highestDegreeLevel([edu('B.Tech CSE'), edu('Master of Computer Applications')]),
    ).toBe('master');
  });

  it("MCA satisfies \"Bachelor's or Master's\" (minimum = bachelor) — Symptom 1 regression", () => {
    const rakesh = [edu('Master of Computer Applications')];
    expect(meetsEducationRequirement(rakesh, 'bachelor')).toBe(true);
    expect(meetsEducationRequirement(rakesh, 'master')).toBe(true);
    expect(meetsEducationRequirement(rakesh, 'phd')).toBe(false);
  });

  it('fails when resume has no parseable degree', () => {
    expect(meetsEducationRequirement([edu(null)], 'bachelor')).toBe(false);
    expect(meetsEducationRequirement([], 'bachelor')).toBe(false);
  });
});

describe('educationRequirementPhrase', () => {
  it('formats display phrases', () => {
    expect(educationRequirementPhrase('bachelor', 'engineering')).toBe(
      "bachelor's degree (engineering)",
    );
    expect(educationRequirementPhrase('master', null)).toBe("master's degree");
    expect(educationRequirementPhrase('phd', null)).toBe('PhD');
  });
});
