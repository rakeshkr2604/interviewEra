/** Do not import from Client Components — server-only convention by path (`lib/server`). */
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url';

/**
 * Origin for server-side `fetch` to first-party routes. Avoids `headers()` so
 * pages stay statically optimizable alongside `revalidate` / ISR.
 */
export function resolveInternalSiteOrigin(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
  return getCanonicalSiteOrigin();
}
