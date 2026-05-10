import { parseResponseJsonSafe } from '@/lib/http/parse-response-json';

export type MultipartJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

/**
 * POST multipart FormData to a same-origin API route and parse JSON safely.
 * Uses credentials so Supabase session cookies are always sent (parity with JSON POSTs).
 */
export async function fetchMultipartJson<T>(
  url: string,
  formData: FormData,
  init?: Omit<RequestInit, 'body' | 'method'>,
): Promise<MultipartJsonResult<T>> {
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    ...init,
  });
  const data = await parseResponseJsonSafe<T>(res);
  if (!res.ok) {
    const rid = res.headers.get('x-request-id') ?? res.headers.get('X-Request-Id');
    console.warn('[fetchMultipartJson]', url, 'HTTP', res.status, 'requestId=', rid ?? 'n/a', data);
  }
  return { ok: res.ok, status: res.status, data };
}
