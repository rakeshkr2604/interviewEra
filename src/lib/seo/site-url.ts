/**
 * Canonical HTTPS origin for SEO surfaces (sitemap, robots).
 * Ignores NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL when they point at localhost
 * so local `.env` never pollutes production XML.
 */
const PRODUCTION_ORIGIN = 'https://interviewera.com' as const;

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
