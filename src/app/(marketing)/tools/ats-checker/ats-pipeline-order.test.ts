import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkAndConsumeFreeToolLimitMock = vi.fn();
const extractTextMock = vi.fn();
const extractDocxTextMock = vi.fn();
const runAtsAnalysisMock = vi.fn();
const getCachedAtsResultMock = vi.fn();
const setCachedAtsResultMock = vi.fn();

vi.mock('@/lib/security/free-tool-rate-limit', () => ({
  checkAndConsumeFreeToolLimit: (...args: unknown[]) =>
    checkAndConsumeFreeToolLimitMock(...args),
}));

vi.mock('@/lib/pdf/parser', () => ({
  extractText: (...args: unknown[]) => extractTextMock(...args),
  normalizeFileName: (name: string) => name,
  PDFCorruptError: class PDFCorruptError extends Error {},
  PDFEncryptedError: class PDFEncryptedError extends Error {},
  PDFParserRuntimeError: class PDFParserRuntimeError extends Error {},
  PDFParserUnavailableError: class PDFParserUnavailableError extends Error {},
  PDFScannedNoTextError: class PDFScannedNoTextError extends Error {},
  PDFUnsupportedError: class PDFUnsupportedError extends Error {},
}));

vi.mock('@/lib/ats/docx-extract', () => ({
  extractDocxText: (...args: unknown[]) => extractDocxTextMock(...args),
  normalizeDocxFileName: (name: string) => name,
  DocxCorruptError: class DocxCorruptError extends Error {},
  DocxEmptyError: class DocxEmptyError extends Error {},
}));

vi.mock('@/lib/ats/score-engine', () => ({
  runAtsAnalysis: (...args: unknown[]) => runAtsAnalysisMock(...args),
}));

vi.mock('@/lib/redis/ats-result-cache', () => ({
  getCachedAtsResult: (...args: unknown[]) => getCachedAtsResultMock(...args),
  setCachedAtsResult: (...args: unknown[]) => setCachedAtsResultMock(...args),
}));

vi.mock('@/lib/ai/tool-chat-completion', () => ({
  isFreeToolAiConfigured: () => true,
  getToolChatClient: () => ({ route: 'openrouter' }),
}));

vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers({
      'x-forwarded-for': '203.0.113.10',
    }),
}));

import { checkAtsAction } from './actions';

describe('checkAtsAction rate-limit ordering', () => {
  beforeEach(() => {
    checkAndConsumeFreeToolLimitMock.mockReset();
    extractTextMock.mockReset();
    extractDocxTextMock.mockReset();
    runAtsAnalysisMock.mockReset();
    getCachedAtsResultMock.mockReset();
    setCachedAtsResultMock.mockReset();
  });

  it('does not parse or call LLM when rate-limited', async () => {
    checkAndConsumeFreeToolLimitMock.mockResolvedValue({
      ok: false,
      message: 'Rate limit reached. You can run up to 3 ATS checks per hour. Please wait and try again.',
    });

    const fd = new FormData();
    fd.set(
      'file',
      new File(['%PDF-1.4 fake'], 'resume.pdf', { type: 'application/pdf' }),
    );

    const state = await checkAtsAction({}, fd);

    expect(state.code).toBe('RATE_LIMIT');
    expect(checkAndConsumeFreeToolLimitMock).toHaveBeenCalledWith(
      'ats-checker',
      '203.0.113.10',
      { failClosed: true },
    );
    expect(extractTextMock).not.toHaveBeenCalled();
    expect(extractDocxTextMock).not.toHaveBeenCalled();
    expect(runAtsAnalysisMock).not.toHaveBeenCalled();
    expect(getCachedAtsResultMock).not.toHaveBeenCalled();
  });

  it('rate-limits before DOCX extract as well', async () => {
    checkAndConsumeFreeToolLimitMock.mockResolvedValue({
      ok: false,
      message: 'Rate limit reached.',
    });

    const fd = new FormData();
    fd.set(
      'file',
      new File(['PK fake'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );

    const state = await checkAtsAction({}, fd);
    expect(state.code).toBe('RATE_LIMIT');
    expect(extractDocxTextMock).not.toHaveBeenCalled();
    expect(runAtsAnalysisMock).not.toHaveBeenCalled();
  });

  it('rejects daily routine tracker before cache or LLM', async () => {
    checkAndConsumeFreeToolLimitMock.mockResolvedValue({ ok: true });
    extractTextMock.mockResolvedValue(`
Daily Routine Tracker
Weekly Goal Tracker
Suggested Daily Schedule
Morning hydrate and exercise
Afternoon focus work
Evening journal and wind down
Personal activity planning sections
`.repeat(2));

    const fd = new FormData();
    fd.set(
      'file',
      new File(['%PDF-1.4 fake'], 'tracker.pdf', { type: 'application/pdf' }),
    );

    const state = await checkAtsAction({}, fd);

    expect(state.code).toBe('WRONG_DOCUMENT_TYPE');
    expect(state.error?.toLowerCase()).toMatch(/resume|cv/);
    expect(runAtsAnalysisMock).not.toHaveBeenCalled();
    expect(getCachedAtsResultMock).not.toHaveBeenCalled();
    expect(setCachedAtsResultMock).not.toHaveBeenCalled();
  });

  it('rejects job description uploaded as the resume', async () => {
    checkAndConsumeFreeToolLimitMock.mockResolvedValue({ ok: true });
    extractTextMock.mockResolvedValue(`
About the role
Key responsibilities: own the API roadmap, mentor juniors.
Requirements: 3 years of experience with distributed systems.
Must-have: PostgreSQL. Nice to have: Kubernetes.
We are looking for a candidate who will apply to this position.
`.trim());

    const fd = new FormData();
    fd.set('file', new File(['%PDF-1.4'], 'jd.pdf', { type: 'application/pdf' }));

    const state = await checkAtsAction({}, fd);
    expect(state.code).toBe('WRONG_DOCUMENT_TYPE');
    expect(runAtsAnalysisMock).not.toHaveBeenCalled();
  });

  it('accepts a valid resume text and proceeds to analysis', async () => {
    checkAndConsumeFreeToolLimitMock.mockResolvedValue({ ok: true });
    getCachedAtsResultMock.mockResolvedValue(null);
    extractTextMock.mockResolvedValue(`
Jane Doe — Software Engineer
B.Tech Computer Science · CGPA 8.4
Work Experience
Intern at ACME — built APIs with Node.js
Technical skills: TypeScript, React, PostgreSQL
Education: Example University
Projects: Interview practice platform
`.trim());
    runAtsAnalysisMock.mockResolvedValue({
      result: { overall: 70 },
      meta: { model: 'test', usage: null },
    });

    const fd = new FormData();
    fd.set('file', new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' }));

    const state = await checkAtsAction({}, fd);
    expect(state.error).toBeUndefined();
    expect(state.result).toBeDefined();
    expect(runAtsAnalysisMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a resume pasted into the optional JD field', async () => {
    checkAndConsumeFreeToolLimitMock.mockResolvedValue({ ok: true });
    getCachedAtsResultMock.mockResolvedValue(null);
    extractTextMock.mockResolvedValue(`
Jane Doe — Software Engineer
B.Tech Computer Science · CGPA 8.4
Work Experience
Intern at ACME — built APIs with Node.js
Technical skills: TypeScript, React, PostgreSQL
Education: Example University
`.trim());

    const resumeAsJd = `
John Smith — Curriculum Vitae
Work Experience at BigCorp as Software Engineer 2019-2024
Technical skills: Java, Spring
Education: B.Tech CGPA 8.1
Internship at Labs
`.repeat(3);

    const fd = new FormData();
    fd.set('file', new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' }));
    fd.set('jobDescription', resumeAsJd);

    const state = await checkAtsAction({}, fd);
    expect(state.code).toBe('WRONG_JD_TYPE');
    expect(runAtsAnalysisMock).not.toHaveBeenCalled();
  });
});
