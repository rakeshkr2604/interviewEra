import { describe, expect, it } from 'vitest';
import { assessHeuristicQuality, buildFallbackParsedResume } from '@/lib/resume/fallback-parse';

const SAMPLE = `
Rakesh Kumar
rakesh@email.com | +91 98765 43210

Skills: JavaScript, TypeScript, React, Node.js, PostgreSQL

Experience
Software Engineer — Acme Corp
Jan 2022 – Present
Built APIs and React dashboards for internal tools.

Education
B.Tech Computer Science, IIT Example
CGPA: 8.5/10, 2021

Projects
Interview Prep App — Next.js, Supabase
`;

describe('buildFallbackParsedResume', () => {
  it('extracts name, skills, experience, and education from typical resume', () => {
    const { data, quality } = buildFallbackParsedResume(SAMPLE);
    expect(data.name).toMatch(/Rakesh/i);
    expect(data.skills.length).toBeGreaterThanOrEqual(3);
    expect(data.experience.length).toBeGreaterThanOrEqual(1);
    expect(data.education.length).toBeGreaterThanOrEqual(1);
    expect(assessHeuristicQuality(data)).toBe('full');
    expect(quality).toBe('full');
    expect(data.parse_warning).toBeUndefined();
  });
});
