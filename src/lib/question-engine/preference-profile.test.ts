import { describe, expect, it } from 'vitest';
import {
  mapCanonicalLevelToQgLevel,
  mapQgLevelToCanonicalLevel,
  parseListInput,
  qgPreferenceProfileSchema,
} from './preference-profile';

describe('mapCanonicalLevelToQgLevel (load direction)', () => {
  it('maps every canonical level onto the 3-bucket form enum', () => {
    expect(mapCanonicalLevelToQgLevel('fresher')).toBe('fresher');
    expect(mapCanonicalLevelToQgLevel('junior')).toBe('1-3 years');
    expect(mapCanonicalLevelToQgLevel('mid')).toBe('3+ years');
    expect(mapCanonicalLevelToQgLevel('senior')).toBe('3+ years');
  });
});

describe('mapQgLevelToCanonicalLevel (save direction, D2 no-downgrade)', () => {
  it('writes the mapped value when nothing is stored', () => {
    expect(mapQgLevelToCanonicalLevel('fresher', undefined)).toBe('fresher');
    expect(mapQgLevelToCanonicalLevel('1-3 years', null)).toBe('junior');
    expect(mapQgLevelToCanonicalLevel('3+ years', undefined)).toBe('mid');
  });

  it('never downgrades stored mid/senior (acceptance criterion 3)', () => {
    expect(mapQgLevelToCanonicalLevel('fresher', 'senior')).toBe('senior');
    expect(mapQgLevelToCanonicalLevel('1-3 years', 'senior')).toBe('senior');
    expect(mapQgLevelToCanonicalLevel('3+ years', 'senior')).toBe('senior');
    expect(mapQgLevelToCanonicalLevel('fresher', 'mid')).toBe('mid');
    expect(mapQgLevelToCanonicalLevel('1-3 years', 'mid')).toBe('mid');
    expect(mapQgLevelToCanonicalLevel('3+ years', 'mid')).toBe('mid');
  });

  it('upgrades stored fresher/junior when the form shows a broader bucket', () => {
    expect(mapQgLevelToCanonicalLevel('1-3 years', 'fresher')).toBe('junior');
    expect(mapQgLevelToCanonicalLevel('3+ years', 'fresher')).toBe('mid');
    expect(mapQgLevelToCanonicalLevel('3+ years', 'junior')).toBe('mid');
  });

  it('does not downgrade junior to fresher from a narrower form selection', () => {
    expect(mapQgLevelToCanonicalLevel('fresher', 'junior')).toBe('junior');
  });

  it('keeps equal values stable', () => {
    expect(mapQgLevelToCanonicalLevel('fresher', 'fresher')).toBe('fresher');
    expect(mapQgLevelToCanonicalLevel('1-3 years', 'junior')).toBe('junior');
  });
});

describe('qgPreferenceProfileSchema', () => {
  it('accepts a minimal profile and a full profile', () => {
    expect(qgPreferenceProfileSchema.safeParse({ profile_version: 1 }).success).toBe(true);
    expect(
      qgPreferenceProfileSchema.safeParse({
        profile_version: 1,
        role: 'Backend Developer',
        level: '1-3 years',
        domain: 'software engineering',
        degree: 'MCA',
        target_roles: ['Backend Developer', 'SDE'],
        target_companies: ['TCS', 'Infosys', 'Razorpay'],
      }).success,
    ).toBe(true);
  });

  it('rejects wrong versions, bad enums, and >5 list entries', () => {
    expect(qgPreferenceProfileSchema.safeParse({ profile_version: 2 }).success).toBe(false);
    expect(
      qgPreferenceProfileSchema.safeParse({ profile_version: 1, level: 'senior' }).success,
    ).toBe(false);
    expect(
      qgPreferenceProfileSchema.safeParse({ profile_version: 1, domain: 'software_engineering' })
        .success,
    ).toBe(false);
    expect(
      qgPreferenceProfileSchema.safeParse({
        profile_version: 1,
        target_roles: ['a', 'b', 'c', 'd', 'e', 'f'],
      }).success,
    ).toBe(false);
  });
});

describe('parseListInput', () => {
  it('splits, trims, drops empties, and caps at 5', () => {
    expect(parseListInput(' TCS , Infosys,, Razorpay ')).toEqual(['TCS', 'Infosys', 'Razorpay']);
    expect(parseListInput('a,b,c,d,e,f,g')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(parseListInput('')).toEqual([]);
  });
});
