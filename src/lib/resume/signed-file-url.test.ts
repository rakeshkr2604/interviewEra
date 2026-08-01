import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RESUME_BUCKET,
  RESUME_SIGNED_URL_TTL_SECONDS,
  isOwnedResumeStoragePath,
  mintResumeSignedUrl,
  type ResumeStorageSigner,
} from './signed-file-url';

function makeSigner(opts: {
  signedUrl?: string | null;
  error?: { message: string } | null;
  capture?: { path?: string; expiresIn?: number; bucket?: string };
}): ResumeStorageSigner {
  return {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (path: string, expiresIn: number) => {
          if (opts.capture) {
            opts.capture.bucket = bucket;
            opts.capture.path = path;
            opts.capture.expiresIn = expiresIn;
          }
          return {
            data: opts.signedUrl === undefined ? { signedUrl: 'https://signed.example/r' } : opts.signedUrl ? { signedUrl: opts.signedUrl } : null,
            error: opts.error ?? null,
          };
        },
      }),
    },
  };
}

describe('isOwnedResumeStoragePath', () => {
  const uid = 'user-abc';

  it('accepts canonical upload keys', () => {
    expect(isOwnedResumeStoragePath(`resumes/${uid}/1710000000.pdf`, uid)).toBe(true);
    expect(isOwnedResumeStoragePath(`resumes/${uid}/1710000000.txt`, uid)).toBe(true);
  });

  it('rejects other users, traversal, and malformed paths', () => {
    expect(isOwnedResumeStoragePath(`resumes/other/1.pdf`, uid)).toBe(false);
    expect(isOwnedResumeStoragePath(`resumes/${uid}/../other.pdf`, uid)).toBe(false);
    expect(isOwnedResumeStoragePath(`resumes/${uid}/`, uid)).toBe(false);
    expect(isOwnedResumeStoragePath(`/resumes/${uid}/1.pdf`, uid)).toBe(false);
    expect(isOwnedResumeStoragePath(`resumes//${uid}/1.pdf`, uid)).toBe(false);
    expect(isOwnedResumeStoragePath('', uid)).toBe(false);
  });
});

describe('mintResumeSignedUrl', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('mints a short-lived URL from storage_path with default 120s TTL', async () => {
    const capture: { path?: string; expiresIn?: number; bucket?: string } = {};
    const result = await mintResumeSignedUrl(
      makeSigner({
        signedUrl: 'https://signed.example/token',
        capture,
      }),
      {
        storagePath: 'resumes/user-1/file.pdf',
        userId: 'user-1',
        resumeId: 'resume-1',
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.signedUrl).toBe('https://signed.example/token');
    expect(result.expiresInSeconds).toBe(RESUME_SIGNED_URL_TTL_SECONDS);
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(capture.bucket).toBe(RESUME_BUCKET);
    expect(capture.path).toBe('resumes/user-1/file.pdf');
    expect(capture.expiresIn).toBe(120);

    expect(infoSpy).toHaveBeenCalled();
    const logged = String(infoSpy.mock.calls[0]?.[1] ?? '');
    expect(logged).toContain('"success":true');
    expect(logged).toContain('user-1');
    expect(logged).toContain('resume-1');
    expect(logged).not.toContain('https://signed.example/token');
  });

  it('fails closed on ownership mismatch without calling storage when path is wrong user', async () => {
    const createSignedUrl = vi.fn();
    const client: ResumeStorageSigner = {
      storage: {
        from: () => ({ createSignedUrl }),
      },
    };

    const result = await mintResumeSignedUrl(client, {
      storagePath: 'resumes/other-user/file.pdf',
      userId: 'user-1',
      resumeId: 'resume-1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('ownership_mismatch');
    expect(createSignedUrl).not.toHaveBeenCalled();

    const logged = String(infoSpy.mock.calls[0]?.[1] ?? '');
    expect(logged).toContain('"success":false');
    expect(logged).toContain('ownership_mismatch');
    expect(logged).not.toContain('signedUrl');
  });

  it('logs failure when Supabase signing fails', async () => {
    const result = await mintResumeSignedUrl(
      makeSigner({ signedUrl: null, error: { message: 'boom' } }),
      {
        storagePath: 'resumes/user-1/file.pdf',
        userId: 'user-1',
        resumeId: 'resume-1',
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('sign_failed');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('treats an expired client URL as a regeneration case (new mint each call)', async () => {
    let n = 0;
    const client: ResumeStorageSigner = {
      storage: {
        from: () => ({
          createSignedUrl: async () => {
            n += 1;
            return {
              data: { signedUrl: `https://signed.example/v${n}` },
              error: null,
            };
          },
        }),
      },
    };

    const first = await mintResumeSignedUrl(client, {
      storagePath: 'resumes/user-1/file.pdf',
      userId: 'user-1',
      resumeId: 'resume-1',
    });
    const second = await mintResumeSignedUrl(client, {
      storagePath: 'resumes/user-1/file.pdf',
      userId: 'user-1',
      resumeId: 'resume-1',
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.signedUrl).not.toBe(second.signedUrl);
    expect(n).toBe(2);
  });
});
