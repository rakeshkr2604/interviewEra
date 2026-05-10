/**
 * POST multipart FormData to a same-origin API route and parse JSON safely.
 * Uses credentials so Supabase session cookies are always sent (parity with JSON POSTs).
 */
export type MultipartJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T;
  /** From `X-Request-Id` / `x-request-id` or JSON body `requestId` when headers are stripped (e.g. edge HTML). */
  requestId?: string;
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

  const ridFromHeader = res.headers.get('x-request-id') ?? res.headers.get('X-Request-Id');
  const ridFromBody =
    data &&
    typeof data === 'object' &&
    data !== null &&
    'requestId' in data &&
    typeof (data as { requestId: unknown }).requestId === 'string'
      ? (data as { requestId: string }).requestId.trim()
      : '';
  const requestId = (ridFromHeader?.trim() || ridFromBody) || undefined;

  if (!res.ok) {
    console.warn('[fetchMultipartJson]', url, 'HTTP', res.status, 'requestId=', requestId ?? 'n/a', {
      parsedKeys: data && typeof data === 'object' ? Object.keys(data as object) : [],
      bodyPreview: snippet.slice(0, 2500),
    });
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    requestId,
    rawBodySnippet: !res.ok ? snippet.slice(0, 2500) : undefined,
  };
}
