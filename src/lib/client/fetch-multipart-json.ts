/**
 * POST multipart FormData to a same-origin API route and parse JSON safely.
 * Uses credentials so Supabase session cookies are always sent (parity with JSON POSTs).
 */
export type MultipartJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T;
  /** First ~2.5k chars when !ok — surfaces HTML error pages / truncated JSON. */
  rawBodySnippet?: string;
};

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
  const text = await res.text();
  const snippet = text.length > 4000 ? `${text.slice(0, 4000)}…(truncated)` : text;

  let data = {} as T;
  try {
    if (text.trim()) data = JSON.parse(text) as T;
  } catch (parseErr) {
    console.warn('[fetchMultipartJson] JSON.parse failed', url, 'HTTP', res.status, {
      parseErr: parseErr instanceof Error ? parseErr.message : parseErr,
      bodyPreview: snippet.slice(0, 1500),
    });
  }

  const rid = res.headers.get('x-request-id') ?? res.headers.get('X-Request-Id');
  if (!res.ok) {
    console.warn('[fetchMultipartJson]', url, 'HTTP', res.status, 'requestId=', rid ?? 'n/a', {
      parsedKeys: data && typeof data === 'object' ? Object.keys(data as object) : [],
      bodyPreview: snippet.slice(0, 2500),
    });
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    rawBodySnippet: !res.ok ? snippet.slice(0, 2500) : undefined,
  };
}
