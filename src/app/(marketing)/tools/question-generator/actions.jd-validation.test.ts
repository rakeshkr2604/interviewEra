import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkAndConsumeFreeToolLimitMock = vi.fn();
const generateQgSetMock = vi.fn();

vi.mock('@/lib/security/free-tool-rate-limit', () => ({
  checkAndConsumeFreeToolLimit: (...args: unknown[]) =>
    checkAndConsumeFreeToolLimitMock(...args),
}));

vi.mock('@/lib/question-engine/generate', () => ({
  generateQgSet: (...args: unknown[]) => generateQgSetMock(...args),
}));

vi.mock('@/lib/question-engine/cache', () => ({
  buildQgSetCacheKey: () => 'k',
  getCachedQgSet: async () => null,
  setCachedQgSet: async () => undefined,
}));

vi.mock('@/lib/openrouter/client', () => ({
  isOpenRouterConfigured: () => true,
}));

vi.mock('@/lib/telemetry/tool-usage-logger', () => ({
  isSignedInFromHeaders: () => false,
  logToolUsage: () => undefined,
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.10' }),
}));

import { generateQuestionsAction } from './actions';

describe('generateQuestionsAction JD semantic validation', () => {
  beforeEach(() => {
    checkAndConsumeFreeToolLimitMock.mockReset();
    generateQgSetMock.mockReset();
    checkAndConsumeFreeToolLimitMock.mockResolvedValue({ ok: true });
  });

  it('rejects a resume pasted as JD before LLM', async () => {
    const fd = new FormData();
    fd.set('mode', 'jd');
    fd.set(
      'jd',
      `
John Smith — Curriculum Vitae
Work Experience at BigCorp as Software Engineer 2019-2024
Technical skills: Java, Spring, PostgreSQL
Education: B.Tech CGPA 8.1
Internship at Labs
Languages known: English
`.repeat(3),
    );

    const result = await generateQuestionsAction({}, fd);
    expect(result.error).toBeTruthy();
    expect(result.error?.toLowerCase()).toMatch(/resume|cv|job description/);
    expect(generateQgSetMock).not.toHaveBeenCalled();
    expect(checkAndConsumeFreeToolLimitMock).not.toHaveBeenCalled();
  });

  it('accepts a clear JD and proceeds past validation', async () => {
    generateQgSetMock.mockResolvedValue({
      ok: true,
      questions: [{ id: '1', text: 'Tell me about yourself', type: 'behavioral' }],
    });

    const fd = new FormData();
    fd.set('mode', 'jd');
    fd.set(
      'jd',
      `
About the role
Key responsibilities: own the API roadmap, mentor juniors.
Requirements: 3 years of experience with distributed systems.
Must-have: PostgreSQL. Nice to have: Kubernetes.
We are looking for a candidate who will apply to this position.
`.trim(),
    );

    const result = await generateQuestionsAction({}, fd);
    expect(result.error).toBeUndefined();
    expect(generateQgSetMock).toHaveBeenCalledTimes(1);
  });
});
