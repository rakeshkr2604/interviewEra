'use client';

/**
 * Browser-only, non-authoritative hint that a Supabase client session may exist.
 *
 * Used solely for progressive UI hydration (e.g. marketing navbar placeholder).
 * Do not use for routing guards, API authorization, or any security decision.
 *
 * Cookie naming follows @supabase/ssr — same family as clearSupabaseCookiesClientSide.
 */
export function hasClientSessionStorageHint(cookieHeader?: string): boolean {
  const header =
    cookieHeader ?? (typeof document !== 'undefined' ? document.cookie : '');
  if (!header) return false;

  return header
    .split(';')
    .some((part) => {
      const name = part.split('=')[0]?.trim();
      if (!name?.startsWith('sb-')) return false;
      return name.endsWith('-auth-token');
    });
}
