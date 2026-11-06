/**
 * Origin for Supabase `redirectTo` / OAuth callbacks. Should match a URL in
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 *
 * In the browser, always use the current document origin so preview deployments
 * (e.g. *.vercel.app) return to the same host after OAuth — not production
 * NEXT_PUBLIC_APP_URL baked in at build time.
 *
 * Server-side callers (none today for OAuth start) fall back to NEXT_PUBLIC_APP_URL.
 * Production stays on the canonical host via middleware / vercel.json redirects.
 */
export function getAuthRedirectOrigin(): string {
  if (typeof window !== 'undefined') {
    // `npm run dev` binds -H 0.0.0.0 for LAN access. If this tab was opened via
    // that bind-all address instead of localhost, Supabase's redirect-URL
    // allowlist (configured for localhost) would reject the OAuth callback —
    // normalize so Google sign-in keeps working regardless of how the dev
    // server was reached.
    if (window.location.hostname === '0.0.0.0') {
      return `${window.location.protocol}//localhost:${window.location.port}`;
    }
    return window.location.origin;
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ?? '';
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  return '';
}
