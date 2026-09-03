import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { shouldClearStaleAuthCookies } from '@/lib/supabase/session';
const AUTH_TRACE_ENABLED = process.env.IE_DIAGNOSTICS_AUTH_TRACE === '1';

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
  const correlationId = AUTH_TRACE_ENABLED
    ? (request.headers.get('x-ie-correlation-id') ??
      request.headers.get('x-vercel-id') ??
      crypto.randomUUID().slice(0, 12))
    : null;
  let forwardHeaders = new Headers(request.headers);
  let supabaseResponse = NextResponse.next({
    request: {
      headers: forwardHeaders,
    },
  });

  const rewriteForwardRequestWithoutSupabaseCookies = () => {
    forwardHeaders = new Headers(request.headers);
    const nextCookie = cookieHeaderWithoutSupabase(forwardHeaders.get('cookie'));
    if (nextCookie) forwardHeaders.set('cookie', nextCookie);
    else forwardHeaders.delete('cookie');
    // RSC `cookies()` can still see original sb-* cookies; server client filters when this is set.
    forwardHeaders.set('x-ie-sb-cookies-stripped', '1');
    if (correlationId) forwardHeaders.set('x-ie-correlation-id', correlationId);
    supabaseResponse = NextResponse.next({
      request: {
        headers: forwardHeaders,
      },
    });
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
          supabaseResponse = NextResponse.next({
            request: {
              headers: forwardHeaders,
            },
          });
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
        if (AUTH_TRACE_ENABLED) {
          console.warn(
            '[auth-trace][update-session]',
            JSON.stringify({
              correlation_id: correlationId,
              event: 'stale_auth_cookies_cleared',
              error_message: error.message,
              error_code: error.code ?? null,
            }),
          );
        }
      } else if (AUTH_TRACE_ENABLED) {
        console.warn(
          '[auth-trace][update-session]',
          JSON.stringify({
            correlation_id: correlationId,
            event: 'auth_get_user_error',
            error_message: error.message,
            error_code: error.code ?? null,
          }),
        );
      }
      if (AUTH_TRACE_ENABLED) {
        console.info(
          '[auth-trace][update-session]',
          JSON.stringify({
            correlation_id: correlationId,
            event: 'auth_resolved',
            has_user: false,
          }),
        );
      }
      return { response: supabaseResponse, user: null };
    }
    if (AUTH_TRACE_ENABLED) {
      console.info(
        '[auth-trace][update-session]',
        JSON.stringify({
          correlation_id: correlationId,
          event: 'auth_resolved',
          has_user: !!user,
        }),
      );
    }
    return { response: supabaseResponse, user };
  } catch (err) {
    if (shouldClearStaleAuthCookies(err)) {
      rewriteForwardRequestWithoutSupabaseCookies();
      clearSupabaseAuthCookies();
      if (AUTH_TRACE_ENABLED) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          '[auth-trace][update-session]',
          JSON.stringify({
            correlation_id: correlationId,
            event: 'auth_exception_stale_cookies_cleared',
            error_message: message,
          }),
        );
      }
    } else if (AUTH_TRACE_ENABLED) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        '[auth-trace][update-session]',
        JSON.stringify({
          correlation_id: correlationId,
          event: 'auth_exception',
          error_message: message,
        }),
      );
    }
    return { response: supabaseResponse, user: null };
  }
}
