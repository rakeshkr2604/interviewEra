import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/campus',
  '/join',
  '/auth/callback',
]);
const AUTH_ROUTES = new Set(['/login', '/signup']);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// In-memory store: adequate for MVP; resets on cold start / new instance.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// [pathPrefix, requestsPerWindow, windowMs]
const RATE_LIMITS: [string, number, number][] = [
  ['/api/interview/start', 10, 60_000],
  ['/api/interview/answer', 60, 60_000],
  ['/api/resume/upload', 5, 60_000],
  ['/api/payments', 10, 60_000],
  ['/api/tools', 5, 60_000],
];

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ─── Security Headers ─────────────────────────────────────────────────────────
const SECURITY_HEADERS: [string, string][] = [
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(self), geolocation=()'],
  ['X-DNS-Prefetch-Control', 'on'],
];

function addSecurityHeaders(res: NextResponse): NextResponse {
  SECURITY_HEADERS.forEach(([key, value]) => res.headers.set(key, value));
  return res;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');
  const isPublic =
    PUBLIC_ROUTES.has(pathname) || pathname.startsWith('/tools/');
  const needsAuthResolution =
    AUTH_ROUTES.has(pathname) || (!isPublic && !isApi);

  // Rate limiting — checked before auth/DB calls for efficiency
  const rateConfig = RATE_LIMITS.find(([prefix]) => pathname.startsWith(prefix));
  if (rateConfig) {
    const [, limit, windowMs] = rateConfig;
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(`${ip}:${pathname}`, limit, windowMs)) {
      return addSecurityHeaders(
        new NextResponse('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': '60' },
        })
      );
    }
  }

  if (!needsAuthResolution) {
    return addSecurityHeaders(NextResponse.next());
  }

  const { response, user } = await updateSession(request);

  // Unauthenticated user on a protected route → send to login (API returns JSON 401 from handlers)
  if (!user && !isPublic && !isApi) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL('/login', request.url))
    );
  }

  // Authenticated user on a pure auth route → send to dashboard
  if (user && AUTH_ROUTES.has(pathname)) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL('/dashboard', request.url))
    );
  }

  return addSecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml).*)'],
};
