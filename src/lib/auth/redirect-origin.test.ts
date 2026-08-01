import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthRedirectOrigin } from './redirect-origin';

describe('getAuthRedirectOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('prefers window.location.origin over NEXT_PUBLIC_APP_URL in the browser', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://interviewera.com');
    vi.stubGlobal('window', {
      location: { origin: 'https://interviewera-git-feat.vercel.app' },
    });
    expect(getAuthRedirectOrigin()).toBe('https://interviewera-git-feat.vercel.app');
  });

  it('falls back to NEXT_PUBLIC_APP_URL when window is unavailable', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://interviewera.com');
    expect(getAuthRedirectOrigin()).toBe('https://interviewera.com');
  });

  it('returns empty string when neither browser nor env is set', () => {
    expect(getAuthRedirectOrigin()).toBe('');
  });
});
