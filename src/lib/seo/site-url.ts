/**
 * Canonical HTTPS origin for SEO surfaces (sitemap, robots, JSON-LD, metadataBase).
 * Ignores NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL when they point at localhost
 * so local `.env` never pollutes production XML.
 */
const PRODUCTION_ORIGIN = 'https://interviewera.com' as const;

/** Apex host only (no scheme, no www) — keep in sync with `middleware.ts` + `vercel.json`. */
export const CANONICAL_HOST = 'interviewera.com' as const;

function isLocalhostHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h.endsWith('.localhost')
  );
}

function originFromEnv(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const normalized = raw.replace(/\/$/, '');
  try {
    const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
    const u = new URL(withProtocol);
    if (isLocalhostHost(u.hostname)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** Base URL for sitemap.xml and robots.txt sitemap directive (no trailing slash). */
export function getCanonicalSiteOrigin(): string {
  const fromApp = originFromEnv(process.env.NEXT_PUBLIC_APP_URL);
  if (fromApp) return fromApp;
  const fromSite = originFromEnv(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromSite) return fromSite;
  return PRODUCTION_ORIGIN;
}

/**
 * Normalizes a path segment for canonical URLs: leading slash, no trailing slash
 * (except root `/`).
 */
export function normalizeSeoPath(path: string): string {
  if (!path || path === '/') return '/';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Full canonical URL for a path (HTTPS apex origin + normalized path). */
export function canonicalUrl(path: string): string {
  const origin = getCanonicalSiteOrigin();
  const p = normalizeSeoPath(path);
  if (p === '/') return origin;
  return `${origin}${p}`;
}
