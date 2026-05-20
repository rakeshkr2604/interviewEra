/**
 * Gated upload / env diagnostics. Enable on Vercel only while debugging:
 * - IE_UPLOAD_DIAGNOSTICS=1 — richer JSON errors + stacks from resume upload route
 * - IE_DEBUG_ROUTES=1 — unlock /api/debug/env, /api/debug/storage, /api/debug/storage-upload
 * - IE_UPLOAD_SKIP_DB=1 — resume upload returns after storage only (see route)
 * - IE_UPLOAD_BYPASS_PARSE=1 — skip PDF/text extraction + doc checks; storage + DB test only
 */

export function isUploadDiagnosticsEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.IE_UPLOAD_DIAGNOSTICS === '1'
  );
}

/** Verbose PDF.js / `@napi-rs/canvas` fallback logs — same gate as upload diagnostics. */
export function isPdfParserDiagnosticsEnabled(): boolean {
  return isUploadDiagnosticsEnabled();
}

export function isDebugRoutesEnabled(): boolean {
  return process.env.IE_DEBUG_ROUTES === '1';
}

export function shouldSkipResumeDbInsert(): boolean {
  return process.env.IE_UPLOAD_SKIP_DB === '1';
}

export function shouldBypassResumeParsePipeline(): boolean {
  return process.env.IE_UPLOAD_BYPASS_PARSE === '1';
}

/**
 * Returns the format of a Supabase service-role key without leaking its value.
 * - 'jwt'     → legacy format, starts with "eyJ"
 * - 'secret'  → new format, starts with "sb_secret_"
 * - 'invalid' → empty, too short, or unrecognised prefix
 */
export function supabaseServiceKeyFormat(
  key: string | undefined,
): 'jwt' | 'secret' | 'invalid' {
  const k = key?.trim();
  if (!k || k.length <= 20) return 'invalid';
  if (k.startsWith('eyJ')) return 'jwt';
  if (k.startsWith('sb_secret_')) return 'secret';
  return 'invalid';
}

/** Supabase JWT `ref` claim — compare anon vs service keys for same project. */
export function supabaseJwtProjectRef(jwt: string | undefined): string | null {
  if (!jwt?.includes('.')) return null;
  const mid = jwt.split('.')[1];
  if (!mid) return null;
  try {
    const b64 = mid.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const p = JSON.parse(json) as { ref?: string };
    return typeof p.ref === 'string' ? p.ref : null;
  } catch {
    return null;
  }
}

export function supabaseProjectRefFromUrl(urlStr: string | undefined): string | null {
  if (!urlStr) return null;
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    const m = /^([a-z0-9]+)\.supabase\.co$/.exec(host);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function redactSecretPrefix(value: string | undefined, len: number): string {
  if (!value?.trim()) return 'missing';
  const v = value.trim();
  if (v.length <= len) return `${v.slice(0, 2)}…(short)`;
  return `${v.slice(0, len)}…`;
}
