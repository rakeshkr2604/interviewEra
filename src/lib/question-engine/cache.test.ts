import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildQgAnswerCacheKey, buildQgSetCacheKey } from './cache';
import type { QgAnswer, QgQuestion } from './schemas';

describe('buildQgSetCacheKey', () => {
  it('is stable and normalization-insensitive within a mode', () => {
    const a = buildQgSetCacheKey({
      mode: 'role',
      role: 'Software Engineer',
      level: 'fresher',
      domain: 'software engineering',
    });
    const b = buildQgSetCacheKey({
      mode: 'role',
      role: '  software   engineer ',
      level: 'FRESHER',
      domain: 'Software Engineering',
    });
    expect(a).toBe(b);
  });

  it('produces distinct keys per mode for the same underlying text', () => {
    const roleKey = buildQgSetCacheKey({
      mode: 'role',
      role: 'Amazon',
      level: 'fresher',
      domain: 'general',
    });
    const topicKey = buildQgSetCacheKey({ mode: 'topic', topic: 'Amazon', level: 'fresher' });
    const companyKey = buildQgSetCacheKey({
      mode: 'company',
      company: 'Amazon',
      role: 'SDE',
      level: 'fresher',
      domain: 'software engineering',
    });
    expect(new Set([roleKey, topicKey, companyKey]).size).toBe(3);
  });

  it('distinguishes topic-mode keys by topic and level', () => {
    const systemDesign = buildQgSetCacheKey({ mode: 'topic', topic: 'System Design', level: '3+ years' });
    const sqlJoins = buildQgSetCacheKey({ mode: 'topic', topic: 'SQL Joins', level: '3+ years' });
    const systemDesignFresher = buildQgSetCacheKey({
      mode: 'topic',
      topic: 'System Design',
      level: 'fresher',
    });
    expect(systemDesign).not.toBe(sqlJoins);
    expect(systemDesign).not.toBe(systemDesignFresher);
  });

  it('distinguishes company-mode keys by company, role, level, and domain', () => {
    const base = buildQgSetCacheKey({
      mode: 'company',
      company: 'Amazon',
      role: 'SDE',
      level: 'fresher',
      domain: 'software engineering',
    });
    const differentCompany = buildQgSetCacheKey({
      mode: 'company',
      company: 'Razorpay',
      role: 'SDE',
      level: 'fresher',
      domain: 'software engineering',
    });
    const differentRole = buildQgSetCacheKey({
      mode: 'company',
      company: 'Amazon',
      role: 'Product Manager',
      level: 'fresher',
      domain: 'software engineering',
    });
    expect(base).not.toBe(differentCompany);
    expect(base).not.toBe(differentRole);
  });
});

describe('buildQgAnswerCacheKey', () => {
  it('separates agentic-topic coaching from generic coaching', () => {
    const generic = buildQgAnswerCacheKey(
      'How would you evaluate a RAG pipeline?',
      '3+ years',
    );
    const agentic = buildQgAnswerCacheKey(
      'How would you evaluate a RAG pipeline?',
      '3+ years',
      'Agentic AI / AI Engineer',
    );
    expect(agentic).not.toBe(generic);
  });
});

describe('QG cache keys include DEPLOY_ID (durable-cache pattern, matches ATS)', () => {
  it('set-cache keys embed a deploy segment between the prompt version and the mode', () => {
    const key = buildQgSetCacheKey({
      mode: 'role',
      role: 'Software Engineer',
      level: 'fresher',
      domain: 'general',
    });
    // qg:<QG_PROMPT_VERSION>:<DEPLOY_ID>:set:<hash>
    expect(key).toMatch(/^qg:v\d+:[^:]+:set:[0-9a-f]+$/);
  });

  it('answer-cache keys embed the same deploy segment', () => {
    const key = buildQgAnswerCacheKey('What is a hash map?', 'fresher');
    expect(key).toMatch(/^qg:v\d+:[^:]+:ans:[0-9a-f]+$/);
  });
});

describe('QG cache — dev cache-read gate (same durable pattern as ATS result cache)', () => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const originalEnv = process.env.NODE_ENV;

  const SAMPLE_QUESTIONS: QgQuestion[] = [
    {
      order: 1,
      question_text: 'Explain the difference between a hash map and a tree map.',
      category: 'technical',
      difficulty: 'easy',
      probing: 'Evaluates whether the candidate understands amortized lookup cost trade-offs.',
    },
  ];

  const SAMPLE_ANSWER: QgAnswer = {
    framework: 'STAR',
    answer_approach: ['Set up the scenario', 'Describe the action taken', 'State the measurable result'],
    common_mistakes: ['Being too vague about impact', 'Skipping the personal contribution'],
    follow_ups: ['What would you do differently?', 'How did you measure success?'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((key: string) =>
      Promise.resolve(key.includes(':ans:') ? SAMPLE_ANSWER : SAMPLE_QUESTIONS),
    );
    vi.doMock('@/lib/redis/client', () => ({
      default: () => ({ get: mockGet, set: mockSet }),
    }));
  });

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalEnv ?? 'test');
    vi.unstubAllEnvs();
    vi.doUnmock('@/lib/redis/client');
    vi.resetModules();
  });

  it('getCachedQgSet always misses outside production, even when Redis has a value', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { getCachedQgSet } = await import('./cache');

    const result = await getCachedQgSet('qg:v4:local-dev:set:abc');
    expect(result).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('getCachedQgSet reads from Redis in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const { getCachedQgSet } = await import('./cache');

    const result = await getCachedQgSet('qg:v4:abc123:set:def');
    expect(result).toEqual(SAMPLE_QUESTIONS);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('getCachedQgAnswer always misses outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { getCachedQgAnswer } = await import('./cache');

    const result = await getCachedQgAnswer('qg:v4:local-dev:ans:abc');
    expect(result).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('setCachedQgSet and setCachedQgAnswer still write outside production (parity — only reads are gated)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { setCachedQgSet, setCachedQgAnswer } = await import('./cache');

    await setCachedQgSet('qg:v4:local-dev:set:abc', SAMPLE_QUESTIONS);
    await setCachedQgAnswer('qg:v4:local-dev:ans:abc', SAMPLE_ANSWER);
    expect(mockSet).toHaveBeenCalledTimes(2);
  });
});
