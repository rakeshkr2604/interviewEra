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
  if (process.env.NODE_ENV === 'development') {
    if (!res.ok) {
      console.warn(`[fetchMultipartJson] ${url} HTTP ${res.status}`, data);
    }
  }
  return { ok: res.ok, status: res.status, data };
}
