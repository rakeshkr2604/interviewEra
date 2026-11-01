import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkAndConsumeFreeToolLimitMock = vi.fn();
const generateQgSetMock = vi.fn();

vi.mock('@/lib/security/free-tool-rate-limit', () => ({
  checkAndConsumeFreeToolLimit: (...args: unknown[]) =>
    checkAndConsumeFreeToolLimitMock(...args),
}));

const requireFreeToolUserMock = vi.fn();

vi.mock('@/lib/security/free-tool-access', () => ({
  requireFreeToolUser: () => requireFreeToolUserMock(),
  clientIpFromHeaders: (h: Headers) => h.get('x-forwarded-for') ?? 'unknown',
}));

vi.mock('@/lib/analytics/free-tool-events', () => ({
  recordFreeToolCompleted: () => undefined,
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
    requireFreeToolUserMock.mockReset().mockResolvedValue({ ok: true, userId: 'u1', tier: 'free' });
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

describe('generateQuestionsAction — verified account required', () => {
  beforeEach(() => {
    requireFreeToolUserMock.mockReset().mockResolvedValue({
      ok: false,
      code: 'AUTH_REQUIRED',
      message: 'Create a free InterviewEra account or sign in to use this tool.',
      status: 401,
    });
    checkAndConsumeFreeToolLimitMock.mockReset();
    generateQgSetMock.mockReset();
  });

  it('returns AUTH_REQUIRED before rate limiting or any AI / parsing work', async () => {
    const fd = new FormData();
    fd.set('mode', 'role');
    fd.set('role', 'Backend Engineer');
    const state = await generateQuestionsAction({}, fd);
    expect(state.code).toBe('AUTH_REQUIRED');
    expect(state.error).toMatch(/sign in/i);
    expect(checkAndConsumeFreeToolLimitMock).not.toHaveBeenCalled();
    expect(generateQgSetMock).not.toHaveBeenCalled();
    expect(generateQgSetMock).not.toHaveBeenCalled();
  });
});
