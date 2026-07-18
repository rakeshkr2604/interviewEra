import { describe, expect, it } from 'vitest';
import { buildFallbackParsedResume } from '@/lib/resume/fallback-parse';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';

const SAMPLE = `
Rakesh Kumar
Skills: JavaScript, TypeScript, React, Node.js

Software Engineer intern at Acme Corp
Jan 2022 – Present
`;

describe('buildFallbackParsedResume', () => {
  it('returns interview profile with section arrays (honest empty when absent)', () => {
    const { data } = buildFallbackParsedResume(SAMPLE);
    expect(data.target_role).toBeTruthy();
    expect(data.skills.length).toBeGreaterThanOrEqual(2);
    expect(data.experience_estimate).toBeTruthy();
    expect(Array.isArray(data.experience)).toBe(true);
    expect(Array.isArray(data.education)).toBe(true);
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.sections_missing?.projects).toBe(true);
  });
});

describe('coerceParsedResume', () => {
  it('migrates legacy full resume blobs and keeps sections', () => {
    const profile = coerceParsedResume({
      name: 'Rakesh',
      skills: ['JavaScript', 'React'],
      target_roles: ['Software Engineer'],
      experience: [{ role: 'Developer', company: 'Acme', duration: '2022', description: 'Built APIs' }],
      projects: [{ name: 'App', tech_stack: ['React'], description: 'Demo' }],
      education: [{ institution: 'IIT', degree: 'B.Tech', year_range: '2024' }],
    });
    expect(profile.target_role).toBe('Software Engineer');
    expect(profile.skills).toContain('JavaScript');
    expect(profile.experience_estimate).toBeTruthy();
    expect(profile.experience?.[0]?.organization).toBe('Acme');
    expect(profile.projects?.[0]?.name).toBe('App');
    expect(profile.education?.[0]?.institution).toBe('IIT');
  });

  it('preserves parse-v2 sections when target_role is present', () => {
    const profile = coerceParsedResume({
      target_role: 'Full-Stack Developer',
      skills: ['React'],
      experience_estimate: '0-1 years',
      projects: [{ name: 'InterviewEra', description: 'AI mock interviews', technologies: ['Next.js'] }],
      sections_missing: { experience: true, education: false, projects: false },
      education: [{ institution: 'SBU', degree: 'MCA', year_range: 'May 2026' }],
    });
    expect(profile.projects?.[0]?.name).toBe('InterviewEra');
    expect(profile.education?.[0]?.degree).toBe('MCA');
    expect(profile.sections_missing?.experience).toBe(true);
    expect(profile.sections_missing?.projects).toBe(false);
  });
});
