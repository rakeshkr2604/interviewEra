/**
 * SEO URL safety utilities.
 * Used everywhere a path or canonical URL is generated from dynamic data.
 *
 * Root cause of https://interviewera.com/$ and similar:
 * canonicalUrl('$') → normalizeSeoPath('$') → '/$' (no leading slash, so '/' prefix is added)
 * These utilities add a validation gate that rejects any such value before it reaches
 * the sitemap, metadata, or JSON-LD.
 */

/**
 * Segments that indicate an unresolved template param or runtime bug.
 * Reject punctuation-only segments (`$`, `&`, `---`) and digit-only
 * segments (`10`) so malformed single-token paths never become canonicals.
 *
 * TRADEOFF — numeric-only segments (`^\d+$`): any future route that uses a
 * purely numeric path segment (e.g. `/blog/2026`, `/guides/10`) will fail
 * `isValidSeoPath` / `safeCanonicalUrl`. `canonicalUrl()` returns `null` and
 * `generateMetadata()` omits the canonical tag; other callers must skip the
 * `<loc>` / JSON-LD `url` field. Do not "fix" this by loosening the regex
 * without deciding how numeric routes should opt in.
 */
const INVALID_SEGMENT_RE = /^(?:\d+|undefined|null|\[.*\]|\{.*\}|object\s+Object|[^\p{L}\p{N}]+)$/iu;

/**
 * Returns true if `path` is a valid relative SEO path suitable for use in
 * sitemaps, canonical tags, and JSON-LD.
 *
 * Valid: '/', '/blog', '/interview-questions/software-engineer'
 * Invalid: '', '$', '&', '10', 'undefined', '//', '/[role]', '/null'
 */
export function isValidSeoPath(path: unknown): path is string {
  if (!path || typeof path !== 'string') return false;
  if (path === '/') return true;
  if (!path.startsWith('/')) return false;
  if (path.includes('//')) return false;

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return false;

  for (const seg of segments) {
    if (!seg.trim() || INVALID_SEGMENT_RE.test(seg)) return false;
  }

  return true;
}

/**
 * Returns a full absolute canonical URL, or null if `path` is invalid.
 * Use instead of bare string concatenation whenever the path comes from
 * dynamic or external data.
 */
export function safeCanonicalUrl(path: string, origin: string): string | null {
  if (!isValidSeoPath(path)) return null;
  const base = origin.replace(/\/$/, '');
  const p = path === '/' ? '' : path.replace(/\/+$/, '');
  return `${base}${p || '/'}`;
}

/**
 * Normalises a relative path: ensures leading slash, strips trailing slash
 * (except bare '/'), and rejects known-invalid values.
 * Returns '/' as a safe fallback for anything it cannot normalise.
 */
export function normalizePath(path: unknown): string {
  if (!path || typeof path !== 'string') return '/';
  if (path === '/') return '/';
  const trimmed = path.replace(/\/+$/, '');
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return isValidSeoPath(withSlash) ? withSlash : '/';
}

/**
 * Returns true if `url` is an absolute HTTPS URL with a valid path.
 * Used by the sitemap serializer to filter entries before writing XML.
 */
export function isValidAbsoluteUrl(url: unknown): url is string {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return isValidSeoPath(u.pathname);
  } catch {
    return false;
  }
}
