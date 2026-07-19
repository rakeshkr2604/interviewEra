import { describe, expect, it } from 'vitest';
import { buildQgAnswerCacheKey, buildQgSetCacheKey } from './cache';

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
