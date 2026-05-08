/**
 * Origin for Supabase `redirectTo` / OAuth callbacks. Should match a URL in
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
 * Prefer NEXT_PUBLIC_APP_URL so www vs apex matches production config.
 */
export function getAuthRedirectOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ?? '';
  if (fromEnv.length > 0) {
    return fromEnv;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}
