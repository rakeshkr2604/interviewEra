import { describe, expect, it } from 'vitest';
import { resumeFileDownloadPath, resumeHasFile } from './resume-file-access';

describe('resumeHasFile', () => {
  it('is true only when storage_path is non-empty', () => {
    expect(resumeHasFile('resumes/u/1.pdf')).toBe(true);
    expect(resumeHasFile('  resumes/u/1.pdf  ')).toBe(true);
    expect(resumeHasFile(null)).toBe(false);
    expect(resumeHasFile(undefined)).toBe(false);
    expect(resumeHasFile('')).toBe(false);
    expect(resumeHasFile('   ')).toBe(false);
  });
});

describe('resumeFileDownloadPath', () => {
  it('points at the authenticated file endpoint', () => {
    expect(resumeFileDownloadPath('abc')).toBe('/api/resume/abc/file');
  });
});
