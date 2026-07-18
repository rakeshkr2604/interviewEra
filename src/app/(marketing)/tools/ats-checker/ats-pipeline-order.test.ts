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
});
