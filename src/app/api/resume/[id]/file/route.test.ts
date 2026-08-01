import { beforeEach, describe, expect, it, vi } from 'vitest';

const OWNER = { id: 'owner-1', email: 'owner@example.com' };
const OTHER = { id: 'other-1', email: 'other@example.com' };
const RESUME_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type ResumeRow = {
  id: string;
  user_id: string;
  storage_path: string | null;
  deleted_at: string | null;
  file_url?: string | null;
};

let authUser: { id: string; email: string } | null = OWNER;
let resumeRow: ResumeRow | null;
let createSignedUrlMock: ReturnType<typeof vi.fn>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () =>
        authUser
          ? { data: { user: authUser }, error: null }
          : { data: { user: null }, error: { message: 'no session' } },
    },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table !== 'resumes') {
        throw new Error(`unexpected table ${table}`);
      }
      const filters: Record<string, string> = {};
      const api = {
        select: () => api,
        eq: (col: string, val: string) => {
          filters[col] = val;
          return api;
        },
        maybeSingle: async () => {
          if (!resumeRow) return { data: null, error: null };
          if (filters.id && resumeRow.id !== filters.id) {
            return { data: null, error: null };
          }
          if (filters.user_id && resumeRow.user_id !== filters.user_id) {
            return { data: null, error: null };
          }
          return { data: resumeRow, error: null };
        },
      };
      return api;
    },
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => createSignedUrlMock(...args),
      }),
    },
  }),
}));

import { GET } from './route';

function ctx(id: string = RESUME_ID) {
  return { params: Promise.resolve({ id }) };
}

function req(): Request {
  return new Request(`http://localhost/api/resume/${RESUME_ID}/file`, {
    method: 'GET',
  });
}

beforeEach(() => {
  authUser = OWNER;
  resumeRow = {
    id: RESUME_ID,
    user_id: OWNER.id,
    storage_path: `resumes/${OWNER.id}/1710000000.pdf`,
    deleted_at: null,
    file_url: 'https://public.example/storage/v1/object/public/resumes/legacy.pdf',
  };
  createSignedUrlMock = vi.fn(async () => ({
    data: { signedUrl: 'https://signed.example/fresh-token' },
    error: null,
  }));
});

describe('GET /api/resume/:id/file', () => {
  it('owner download returns a short-lived signed URL from storage_path', async () => {
    const res = await GET(req(), ctx());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe('https://signed.example/fresh-token');
    expect(json.expiresInSeconds).toBe(120);
    expect(json.resumeId).toBe(RESUME_ID);
    expect(createSignedUrlMock).toHaveBeenCalledWith(
      `resumes/${OWNER.id}/1710000000.pdf`,
      120,
    );
    // Must not use the legacy public file_url for signing.
    expect(createSignedUrlMock.mock.calls[0]?.[0]).not.toContain('legacy.pdf');
    expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });

  it('anonymous request is rejected', async () => {
    authUser = null;
    const res = await GET(req(), ctx());
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.code).toBe('UNAUTHORIZED');
    expect(createSignedUrlMock).not.toHaveBeenCalled();
    expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
  });

  it('cross-user request cannot access another user resume', async () => {
    authUser = OTHER;
    const res = await GET(req(), ctx());
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.code).toBe('NOT_FOUND');
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it('missing resume returns 404', async () => {
    resumeRow = null;
    const res = await GET(req(), ctx());
    expect(res.status).toBe(404);
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it('soft-deleted resume returns 404', async () => {
    resumeRow = {
      id: RESUME_ID,
      user_id: OWNER.id,
      storage_path: `resumes/${OWNER.id}/1710000000.pdf`,
      deleted_at: '2026-08-01T00:00:00.000Z',
    };
    const res = await GET(req(), ctx());
    expect(res.status).toBe(404);
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it('resume without storage_path is unavailable even if legacy file_url exists', async () => {
    resumeRow = {
      id: RESUME_ID,
      user_id: OWNER.id,
      storage_path: null,
      deleted_at: null,
      file_url: 'https://public.example/legacy.pdf',
    };
    const res = await GET(req(), ctx());
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.code).toBe('MISSING_STORAGE_PATH');
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it('expired signed URL is recovered by minting a new one on each request', async () => {
    createSignedUrlMock
      .mockResolvedValueOnce({
        data: { signedUrl: 'https://signed.example/expired-token' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { signedUrl: 'https://signed.example/new-token' },
        error: null,
      });

    const first = await GET(req(), ctx());
    const second = await GET(req(), ctx());
    const a = await first.json();
    const b = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(a.url).toBe('https://signed.example/expired-token');
    expect(b.url).toBe('https://signed.example/new-token');
    expect(createSignedUrlMock).toHaveBeenCalledTimes(2);
  });

  it('ownership path mismatch on stored path returns 403', async () => {
    resumeRow = {
      id: RESUME_ID,
      user_id: OWNER.id,
      // Path claims a different folder than the row owner — defense in depth.
      storage_path: 'resumes/attacker/steal.pdf',
      deleted_at: null,
    };
    const res = await GET(req(), ctx());
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.code).toBe('OWNERSHIP_MISMATCH');
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });
});
