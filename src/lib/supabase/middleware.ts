import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { shouldClearStaleAuthCookies } from '@/lib/supabase/session';
const AUTH_TRACE_ENABLED = process.env.IE_DIAGNOSTICS_AUTH_TRACE === '1';

/**
 * supabase.auth.getUser() below has no built-in timeout. Every request to an
 * auth route or a protected page runs through this (proxy.ts),
 * so a slow/unresponsive Supabase auth endpoint — e.g. a transient platform
 * blip, not necessarily anything in this app — previously hung the entire
 * request (observed up to the platform's 300s function timeout) instead of
 * degrading. /login is itself an AUTH_ROUTE, so this is also why "Sign in"
 * could appear to do nothing: the click navigated, but the server response
 * never came back. Race it instead and treat a timeout the same as "no
 * confirmed user" (see the catch block) so the page still renders quickly.
 */
const AUTH_CHECK_TIMEOUT_MS = 5000;

class AuthCheckTimeoutError extends Error {
  constructor() {
    super('auth_check_timeout');
    this.name = 'AuthCheckTimeoutError';
  }
}

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
    } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new AuthCheckTimeoutError()), AUTH_CHECK_TIMEOUT_MS);
      }),
    ]);
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
    if (err instanceof AuthCheckTimeoutError) {
      // Always logged (not gated on AUTH_TRACE_ENABLED) — this is the one
      // signal that distinguishes "Supabase auth was slow" from the flood of
      // downstream timeouts it causes across unrelated routes.
      console.warn(
        `[update-session] auth check timed out after ${AUTH_CHECK_TIMEOUT_MS}ms — proceeding unauthenticated for this request`,
      );
      return { response: supabaseResponse, user: null };
    }
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
