import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { shouldClearStaleAuthCookies } from '@/lib/supabase/session';

/** Remove Supabase chunk cookies from the raw Cookie header (name-only check). */
function cookieHeaderWithoutSupabase(raw: string | null): string | null {
  if (!raw) return null;
  const kept = raw
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((pair) => {
      const i = pair.indexOf('=');
      const name = (i >= 0 ? pair.slice(0, i) : pair).trim();
      return !name.startsWith('sb-');
    });
  return kept.length ? kept.join('; ') : null;
}

export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  // Forward request can be rewritten so RSC/route handlers do not see dead sb-* cookies
  // on the same request (response Set-Cookie clear alone does not remove them from req).
  let forwardRequest: NextRequest = request;
  let supabaseResponse = NextResponse.next({ request: forwardRequest });

  const rewriteForwardRequestWithoutSupabaseCookies = () => {
    const h = new Headers(request.headers);
    const nextCookie = cookieHeaderWithoutSupabase(h.get('cookie'));
    if (nextCookie) h.set('cookie', nextCookie);
    else h.delete('cookie');
    // RSC `cookies()` can still see original sb-* cookies; server client filters when this is set.
    h.set('x-ie-sb-cookies-stripped', '1');
    forwardRequest = new NextRequest(request.url, { headers: h });
    supabaseResponse = NextResponse.next({ request: forwardRequest });
  };

  const clearSupabaseAuthCookies = () => {
    request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith('sb-'))
      .forEach(({ name }) => {
        supabaseResponse.cookies.set(name, '', {
          path: '/',
          maxAge: 0,
        });
      });
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: forwardRequest });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      if (shouldClearStaleAuthCookies(error)) {
        rewriteForwardRequestWithoutSupabaseCookies();
        clearSupabaseAuthCookies();
      }
      return { response: supabaseResponse, user: null };
    }
    return { response: supabaseResponse, user };
  } catch (err) {
    if (shouldClearStaleAuthCookies(err)) {
      rewriteForwardRequestWithoutSupabaseCookies();
      clearSupabaseAuthCookies();
    }
    return { response: supabaseResponse, user: null };
  }
}
