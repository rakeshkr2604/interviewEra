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
  it('returns slim interview profile', () => {
    const { data } = buildFallbackParsedResume(SAMPLE);
    expect(data.target_role).toBeTruthy();
    expect(data.skills.length).toBeGreaterThanOrEqual(2);
    expect(data.experience_estimate).toBeTruthy();
    expect('experience' in data).toBe(false);
  });
});

describe('coerceParsedResume', () => {
  it('migrates legacy full resume blobs', () => {
    const profile = coerceParsedResume({
      name: 'Rakesh',
      skills: ['JavaScript', 'React'],
      target_roles: ['Software Engineer'],
      experience: [{ role: 'Developer', company: 'Acme', duration: '2022', description: '' }],
      projects: [{ name: 'App', tech_stack: [], description: '' }],
      education: [],
    });
    expect(profile.target_role).toBe('Software Engineer');
    expect(profile.skills).toContain('JavaScript');
    expect(profile.experience_estimate).toBeTruthy();
  });
});
