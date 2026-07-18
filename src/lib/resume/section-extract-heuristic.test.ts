import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractText } from '@/lib/pdf/parser';
import { assertPdfPageLimit } from '@/lib/pdf/page-count';
import { buildFallbackParsedResume } from '@/lib/resume/fallback-parse';
import { extractSectionsHeuristic } from '@/lib/resume/section-extract-heuristic';
import { RESUME_PARSER_VERSION } from '@/lib/resume/parser-version';

describe('extractSectionsHeuristic + Rakesh fixture', () => {
  it('exposes parse-v2 parser version constant', () => {
    expect(RESUME_PARSER_VERSION).toBe('parse-v2');
  });

  it('extracts experience, education, and projects from Rakesh_Kumar_Resume.pdf', async () => {
    const path = join(process.cwd(), 'tests/fixtures/pdf/Rakesh_Kumar_Resume.pdf');
    const bytes = new Uint8Array(readFileSync(path));
    await assertPdfPageLimit(bytes, 10);
    const text = await extractText(bytes, { source: 'section-heuristic.rakesh' });

    const sections = extractSectionsHeuristic(text);
    expect(sections.education.length).toBeGreaterThanOrEqual(1);
    expect(sections.education.some((e) => /sarala|iit|mandi|computer/i.test(`${e.institution} ${e.degree}`))).toBe(
      true,
    );

    expect(sections.experience.length).toBeGreaterThanOrEqual(1);
    expect(
      sections.experience.some((e) => /interviewera/i.test(`${e.organization} ${e.title}`)),
    ).toBe(true);

    expect(sections.projects.length).toBeGreaterThanOrEqual(1);
    const names = sections.projects.map((p) => p.name).join(' ');
    expect(names).toMatch(/InterviewEra|SkillBridge/i);
    expect(sections.sections_missing.projects).toBe(false);

    const { data } = buildFallbackParsedResume(text);
    expect(data.projects?.some((p) => /InterviewEra|SkillBridge/i.test(p.name))).toBe(true);
    expect(buildScriptHints(data)).toMatch(/InterviewEra|SkillBridge/i);
  });
});

function buildScriptHints(data: { projects?: Array<{ name: string }> }): string {
  return (data.projects ?? []).map((p) => p.name).join('; ');
}
