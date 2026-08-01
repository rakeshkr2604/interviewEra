/**
 * Deterministic recovery of Supabase Storage object keys from persisted resume file_url values.
 * Never guesses — unsupported shapes return ok: false.
 *
 * Known production shape (Phase 2 inspection):
 *   https://{project}.supabase.co/storage/v1/object/public/resumes/resumes/{userId}/{ts}.pdf
 * → storage_path = resumes/{userId}/{ts}.pdf
 */

export type FileUrlParseSource = 'public' | 'sign' | 'authenticated';

export type FileUrlParseSuccess = {
  ok: true;
  storagePath: string;
  source: FileUrlParseSource;
  /** Pathname after the bucket segment, percent-decoded per segment. */
  objectPath: string;
};

export type FileUrlParseFailure = {
  ok: false;
  reason:
    | 'empty'
    | 'invalid_url'
    | 'unsupported_protocol'
    | 'unsupported_shape'
    | 'wrong_bucket'
    | 'empty_object_path'
    | 'path_traversal'
    | 'invalid_encoding';
  message: string;
};

export type FileUrlParseResult = FileUrlParseSuccess | FileUrlParseFailure;

const RESUME_BUCKET = 'resumes';

/** Match /storage/v1/object/{public|sign|authenticated}/resumes/<objectKey...> */
const OBJECT_PATH_RE =
  /^\/storage\/v1\/object\/(public|sign|authenticated)\/([^/]+)\/(.+)$/;

function decodePathSegments(rawObjectPath: string): { ok: true; path: string } | { ok: false } {
  const segments = rawObjectPath.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) return { ok: false };

  const decoded: string[] = [];
  for (const segment of segments) {
    try {
      const d = decodeURIComponent(segment);
      if (!d || d === '.' || d === '..' || d.includes('/') || d.includes('\\') || d.includes('\0')) {
        return { ok: false };
      }
      decoded.push(d);
    } catch {
      return { ok: false };
    }
  }

  return { ok: true, path: decoded.join('/') };
}

/**
 * Parse a persisted resume file_url into a Storage object key for bucket `resumes`.
 */
export function parseStoragePathFromFileUrl(fileUrl: string | null | undefined): FileUrlParseResult {
  if (fileUrl == null || typeof fileUrl !== 'string' || !fileUrl.trim()) {
    return { ok: false, reason: 'empty', message: 'file_url is empty.' };
  }

  const trimmed = fileUrl.trim();

  // Reject traversal before URL normalization (URL() resolves `/a/../b` → `/b`).
  const pathAndQuery = trimmed.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]*/, '');
  const rawPath = pathAndQuery.split(/[?#]/, 1)[0] ?? '';
  if (/(^|\/)\.\.(\/|$)/.test(rawPath) || /%2e%2e/i.test(rawPath)) {
    return {
      ok: false,
      reason: 'path_traversal',
      message: 'Object path contains traversal segments.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'invalid_url', message: 'file_url is not a valid URL.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      ok: false,
      reason: 'unsupported_protocol',
      message: `Unsupported protocol: ${parsed.protocol}`,
    };
  }

  // Strip query/hash — signed URLs may carry tokens; object key is in the pathname only.
  const pathname = parsed.pathname;
  const match = OBJECT_PATH_RE.exec(pathname);
  if (!match) {
    return {
      ok: false,
      reason: 'unsupported_shape',
      message:
        'URL pathname is not /storage/v1/object/{public|sign|authenticated}/{bucket}/{objectPath}.',
    };
  }

  const source = match[1] as FileUrlParseSource;
  const bucket = match[2];
  const rawObjectPath = match[3];

  if (bucket !== RESUME_BUCKET) {
    return {
      ok: false,
      reason: 'wrong_bucket',
      message: `Expected bucket "${RESUME_BUCKET}", got "${bucket}".`,
    };
  }

  if (!rawObjectPath) {
    return { ok: false, reason: 'empty_object_path', message: 'Object path is empty.' };
  }

  const hasBadEncoding = rawObjectPath.split('/').some((segment) => {
    if (!segment.includes('%')) return false;
    try {
      decodeURIComponent(segment);
      return false;
    } catch {
      return true;
    }
  });
  if (hasBadEncoding) {
    return {
      ok: false,
      reason: 'invalid_encoding',
      message: 'Object path has invalid percent-encoding.',
    };
  }

  const decoded = decodePathSegments(rawObjectPath);
  if (!decoded.ok) {
    return {
      ok: false,
      reason: 'path_traversal',
      message: 'Object path rejected after segment decode (empty, traversal, or unsafe segment).',
    };
  }

  if (!decoded.path) {
    return { ok: false, reason: 'empty_object_path', message: 'Object path is empty.' };
  }

  return {
    ok: true,
    storagePath: decoded.path,
    objectPath: decoded.path,
    source,
  };
}
