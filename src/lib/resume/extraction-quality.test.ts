import { describe, expect, it } from 'vitest';
import { isObviouslyGarbage, scoreExtractedText } from '@/lib/resume/extraction-quality';
import { runLayeredTextExtraction } from '@/lib/resume/extraction-pipeline';

describe('extraction-quality', () => {
  it('scores normal resume text as good or weak', () => {
    const text =
      'John Doe\nSoftware Engineer\nWork Experience\nACME Corp 2021-2024\nSkills: TypeScript, React, Node.js\nB.Tech CS';
    const report = scoreExtractedText(text);
    expect(['good', 'weak']).toContain(report.band);
    expect(report.score).toBeGreaterThan(20);
  });

  it('flags binary garbage as unusable', () => {
    expect(isObviouslyGarbage('\x01\x02\x03\x04\x05')).toBe(true);
  });

  it('layered pipeline keeps readable short text', () => {
    const raw = 'Jane Doe\nIntern at Foo\nSkills: Python, SQL';
    const out = runLayeredTextExtraction(raw);
    expect(out.text.length).toBeGreaterThan(10);
  });
});
