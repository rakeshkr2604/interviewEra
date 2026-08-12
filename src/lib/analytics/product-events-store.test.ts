import { afterEach, describe, expect, it, vi } from 'vitest';

let insertResult: { error: { code?: string; message: string; status?: number } | null } | Error;
const insertMock = vi.fn(async () => {
  if (insertResult instanceof Error) throw insertResult;
  return insertResult;
});
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: fromMock }),
}));

import {
  persistProductEventAsync,
  isNonRetryableError,
  isSupabasePlaceholderCredential,
  getServiceClient,
} from '@/lib/analytics/product-events-store';
import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store';

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

// Exact CI dummy JWT with iss: "supabase-demo" payload
const CI_DEMO_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Synthetic dummy JWT with standard iss: "supabase" payload
const REAL_SYNTHETIC_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJleHAiOjE5ODM4MTI5OTZ9.signature';

// Synthetic JWT with iss: "production-demo-like-issuer" payload
const DEMO_LIKE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9kdWN0aW9uLWRlbW8tbGlrZS1pc3N1ZXIiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiZXhwIjoxOTgzODEyOTk2fQ.signature';

describe('isSupabasePlaceholderCredential', () => {
  it('1. exact CI dummy JWT (iss: "supabase-demo") is detected as a placeholder', () => {
    expect(isSupabasePlaceholderCredential('https://example.supabase.co', CI_DEMO_JWT)).toBe(true);
  });

  it('5. synthetic non-placeholder JWT (iss: "supabase") is NOT a placeholder', () => {
    expect(isSupabasePlaceholderCredential('https://project.supabase.co', REAL_SYNTHETIC_JWT)).toBe(false);
  });

  it('6. JWT with issuer containing "demo" but not exactly "supabase-demo" is NOT a placeholder', () => {
    expect(isSupabasePlaceholderCredential('https://project.supabase.co', DEMO_LIKE_JWT)).toBe(false);
  });

  it('7. malformed JWT fails safely and returns false', () => {
    expect(isSupabasePlaceholderCredential('https://project.supabase.co', 'not.a.valid.jwt.payload')).toBe(false);
  });

  it('detects plain text placeholder strings as placeholder', () => {
    expect(isSupabasePlaceholderCredential('https://placeholder.supabase.co', 'placeholder')).toBe(true);
  });
});

describe('getServiceClient', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('2. returns null when credentials use CI dummy JWT and placeholder URL', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = CI_DEMO_JWT;
    expect(getServiceClient()).toBeNull();
  });

  it('returns client when credentials use normal non-placeholder JWT', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SYNTHETIC_JWT;
    expect(getServiceClient()).not.toBeNull();
  });
});

describe('isNonRetryableError', () => {
  it('returns true for Invalid API key error messages', () => {
    expect(isNonRetryableError({ message: 'Invalid API key' })).toBe(true);
    expect(isNonRetryableError({ message: 'invalid api key provided' })).toBe(true);
  });

  it('returns true for 401 and 403 status codes', () => {
    expect(isNonRetryableError({ status: 401, message: 'Unauthorized' })).toBe(true);
    expect(isNonRetryableError({ status: 403, message: 'Forbidden' })).toBe(true);
  });

  it('returns true for Postgres/PostgREST auth error codes', () => {
    expect(isNonRetryableError({ code: 'PGRST301', message: 'JWT expired' })).toBe(true);
    expect(isNonRetryableError({ code: '42501', message: 'permission denied' })).toBe(true);
  });

  it('returns false for transient network or server errors', () => {
    expect(isNonRetryableError({ message: 'FetchError: network timeout' })).toBe(false);
    expect(isNonRetryableError({ status: 503, message: 'Service Unavailable' })).toBe(false);
    expect(isNonRetryableError({ code: '57P01', message: 'admin shutdown' })).toBe(false);
  });
});

describe('persistProductEventAsync', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    vi.restoreAllMocks();
    insertMock.mockClear();
    fromMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('3 & 4. CI dummy credentials: ZERO Supabase requests made, NO Invalid API key warning emitted', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = CI_DEMO_JWT;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    persistProductEventAsync('interview_started', { user_id: 'u1' });
    await flush();

    expect(insertMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('9. Non-retryable error (Invalid API key) on non-placeholder key: exactly 1 attempt, 0 retries', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SYNTHETIC_JWT;
    insertResult = { error: { message: 'Invalid API key' } };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    persistProductEventAsync('interview_started', { user_id: 'u1' });
    await flush();

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[product-events-store] insert failed:', 'Invalid API key');
  });

  it('HTTP 401: no retry', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SYNTHETIC_JWT;
    insertResult = { error: { status: 401, message: 'Unauthorized request' } };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    persistProductEventAsync('interview_started', { user_id: 'u1' });
    await flush();

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[product-events-store] insert failed:', 'Unauthorized request');
  });

  it('8. Transient error: retry still happens and preserves maximum attempt limit (2 attempts)', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SYNTHETIC_JWT;
    insertResult = { error: { message: 'Connection timeout' } };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    persistProductEventAsync('interview_started', { user_id: 'u1' });
    await new Promise((r) => setTimeout(r, 1100));

    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenNthCalledWith(1, '[product-events-store] insert failed (will retry):', 'Connection timeout');
    expect(warnSpy).toHaveBeenNthCalledWith(2, '[product-events-store] insert failed after retry:', 'Connection timeout');
  });

  it('Successful insert: exactly one insert attempt, 0 warnings', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = REAL_SYNTHETIC_JWT;
    insertResult = { error: null };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    persistProductEventAsync('interview_started', { user_id: 'u1' });
    await flush();

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('10. Milestone event persistence also skips placeholder credentials cleanly', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = CI_DEMO_JWT;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    persistMilestoneEventOnce('interview_started', { user_id: 'u1', interview_id: 'iv-1' });
    await flush();

    expect(insertMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
