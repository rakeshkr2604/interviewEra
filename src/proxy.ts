import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that require authentication (unauthenticated → /login)
const PROTECTED_PREFIXES = ['/college/dashboard', '/admin', '/platform', '/dashboard', '/interview', '/report', '/settings', '/history', '/analytics', '/upgrade', '/feedback', '/profile', '/onboarding'];

// Routes that require NO authentication (authenticated → /dashboard or /college/dashboard)
const AUTH_ONLY_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Block unauthenticated access to protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    // Preserve intended destination so login can redirect back
    const next = pathname + request.nextUrl.search;
    if (next !== '/') loginUrl.searchParams.set('next', next);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_ONLY_PATHS.some((p) => pathname === p) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, _next internals,
     * and public assets.
     */
    '/((?!_next/static|_next/image|favicon|brand|avatars|icons|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|mp3|pdf|csv|txt|xml|json)$).*)',
  ],
};
