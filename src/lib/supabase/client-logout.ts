'use client'

import { createClient } from '@/lib/supabase/client'

/** Max wait for Supabase signOut before cookie fallback + redirect. */
const LOGOUT_TIMEOUT_MS = 2500

/** Strip sb-* auth cookies when signOut stalls (SSR session would otherwise persist). */
function clearSupabaseCookiesClientSide(): void {
  if (typeof document === 'undefined') return

  const host = window.location.hostname
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim())
    .filter((name): name is string => Boolean(name?.startsWith('sb-')))

  for (const name of names) {
    const base = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    document.cookie = `${base}; SameSite=Lax`
    if (host.includes('.')) {
      document.cookie = `${base}; domain=${host}; SameSite=Lax`
    }
  }
}

export type ClientLogoutOptions = {
  /** Post-logout destination. Default `/login`. */
  redirectTo?: string
}

/**
 * App Router + Supabase SSR logout.
 *
 * `scope: 'local'` only clears storage — sb-* cookies stay, middleware still
 * sees a session, and /login redirects back to /dashboard. We use full
 * signOut (cookie-aware), race it at 2.5s, then hard-navigate.
 */
export async function performClientLogout(
  options: ClientLogoutOptions = {},
): Promise<void> {
  if (typeof window === 'undefined') return

  const redirectTo = options.redirectTo ?? '/login'
  const supabase = createClient()

  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, LOGOUT_TIMEOUT_MS)
      }),
    ])
  } catch {
    /* fall through to cookie cleanup */
  }

  clearSupabaseCookiesClientSide()
  window.location.assign(redirectTo)
}
