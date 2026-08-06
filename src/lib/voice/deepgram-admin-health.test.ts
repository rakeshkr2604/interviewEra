import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkDeepgramHealth,
  formatDeepgramHealthReason,
  hasDeepgramConfig,
} from '@/lib/voice/deepgram-admin-health';

const originalFetch = globalThis.fetch;
const originalKey = process.env.DEEPGRAM_API_KEY;
const originalProject = process.env.DEEPGRAM_PROJECT_ID;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.DEEPGRAM_API_KEY;
  else process.env.DEEPGRAM_API_KEY = originalKey;
  if (originalProject === undefined) delete process.env.DEEPGRAM_PROJECT_ID;
  else process.env.DEEPGRAM_PROJECT_ID = originalProject;
  vi.restoreAllMocks();
});

describe('formatDeepgramHealthReason', () => {
  it('labels known reasons', () => {
    expect(formatDeepgramHealthReason('missing_key')).toBe('API key not configured');
    expect(formatDeepgramHealthReason('auth_failed')).toBe('Authentication failed');
  });

  it('returns undefined for empty', () => {
    expect(formatDeepgramHealthReason(undefined)).toBeUndefined();
  });
});

describe('hasDeepgramConfig', () => {
  it('requires both key and project id', () => {
    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.DEEPGRAM_PROJECT_ID;
    expect(hasDeepgramConfig()).toBe(false);

    process.env.DEEPGRAM_API_KEY = 'dg_test_key';
    expect(hasDeepgramConfig()).toBe(false);

    process.env.DEEPGRAM_PROJECT_ID = 'proj_test';
    expect(hasDeepgramConfig()).toBe(true);
  });
});

describe('checkDeepgramHealth', () => {
  it('reports offline when key missing', async () => {
    delete process.env.DEEPGRAM_API_KEY;
    process.env.DEEPGRAM_PROJECT_ID = 'proj_test';
    const result = await checkDeepgramHealth();
    expect(result).toMatchObject({ status: 'offline', reason: 'missing_key' });
  });

  it('reports offline when project id missing', async () => {
    process.env.DEEPGRAM_API_KEY = 'dg_test_key';
    delete process.env.DEEPGRAM_PROJECT_ID;
    const result = await checkDeepgramHealth();
    expect(result).toMatchObject({ status: 'offline', reason: 'missing_project_id' });
  });

  it('reports healthy on 200', async () => {
    process.env.DEEPGRAM_API_KEY = 'dg_test_key';
    process.env.DEEPGRAM_PROJECT_ID = 'proj_test';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    }) as unknown as typeof fetch;

    const result = await checkDeepgramHealth();
    expect(result.status).toBe('healthy');
    expect(result.reason).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.deepgram.com/v1/projects/proj_test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Token dg_test_key',
        }),
      }),
    );
  });

  it('reports auth_failed on 401', async () => {
    process.env.DEEPGRAM_API_KEY = 'dg_bad_key';
    process.env.DEEPGRAM_PROJECT_ID = 'proj_test';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;

    const result = await checkDeepgramHealth();
    expect(result).toMatchObject({ status: 'offline', reason: 'auth_failed' });
  });

  it('reports project_not_found on 404', async () => {
    process.env.DEEPGRAM_API_KEY = 'dg_test_key';
    process.env.DEEPGRAM_PROJECT_ID = 'proj_missing';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    const result = await checkDeepgramHealth();
    expect(result).toMatchObject({ status: 'offline', reason: 'project_not_found' });
  });
});
