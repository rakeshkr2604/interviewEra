import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtsResultV2 } from '@/lib/ats/types';

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.mock('./client', () => ({
  default: () => ({ get: mockGet, set: mockSet }),
}));

const SAMPLE: AtsResultV2 = {
  parseability: { score: 100, findings: [] },
  fieldExtraction: { score: 100, extracted: {} as never, missingFields: [] },
  structureQuality: { score: 90, findings: [] },
  actionItems: [],
  jdMatch: null,
};

describe('ats-result-cache — dev cache-read gate (fix for repeated stale-cache confusion)', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(SAMPLE);
  });

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalEnv ?? 'test');
    vi.unstubAllEnvs();
  });

  it('always misses on read outside production, even when Redis has a value', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { getCachedAtsResult } = await import('./ats-result-cache');

    const result = await getCachedAtsResult('some-key');
    expect(result).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('reads from Redis in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const { getCachedAtsResult } = await import('./ats-result-cache');

    const result = await getCachedAtsResult('some-key');
    expect(result).toEqual(SAMPLE);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('still writes to Redis outside production (parity — only reads are gated)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const { setCachedAtsResult } = await import('./ats-result-cache');

    await setCachedAtsResult('some-key', SAMPLE);
    expect(mockSet).toHaveBeenCalledTimes(1);
  });
});
