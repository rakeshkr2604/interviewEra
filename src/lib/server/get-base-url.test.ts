import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEmailAppUrl } from '@/lib/server/get-base-url';

describe('getEmailAppUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('never returns localhost even when NEXT_PUBLIC_APP_URL is local', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    vi.stubEnv('VERCEL_URL', 'interviewera-git-main.vercel.app');
    vi.stubEnv('NODE_ENV', 'development');
    expect(getEmailAppUrl()).toBe('https://interviewera.com');
  });

  it('uses non-local NEXT_PUBLIC_APP_URL when set', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://interviewera.com');
    expect(getEmailAppUrl()).toBe('https://interviewera.com');
  });
});
