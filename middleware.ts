import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/about',
  '/interviewera',   // brand entity page (public, crawlable)
  '/how-it-works',   // product explainer page (public, crawlable)
  '/campus',
  '/college',        // college marketing/landing page
  '/college/signup', // T&P officer signup form
  '/join',
  '/privacy',
  '/terms',
  '/refund',
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

/** Apex hostname — www always redirects here (CSP 'self' + chunk URLs assume one canonical site). */
const PRODUCTION_APEX = 'interviewera.com';

function forwardedHost(request: NextRequest): string {
  const raw =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ??
    request.headers.get('host') ??
    '';
  const host = raw.split(':')[0];
  return host ? host.toLowerCase() : '';
}

/** Vercel preview thumbnails, Lighthouse, crawlers — skip session/auth work (still after www normalize). */
function shouldBypassMiddlewareForUserAgent(userAgent: string | null): boolean {
  const ua = (userAgent ?? '').toLowerCase();
  return (
    ua.includes('vercel') ||
    ua.includes('lighthouse') ||
    ua.includes('crawler') ||
    /\bbot\b/.test(ua) ||
    ua.endsWith('bot') // googlebot, bingbot, etc. (avoid naive `includes('bot')` → Roboto-style false positives)
  );
}

export async function middleware(request: NextRequest) {
  const host = forwardedHost(request);
  /** Align with `vercel.json` + GSC: single 301 hop to HTTPS apex (not 308, for parity with platform redirects). */
  if (host === `www.${PRODUCTION_APEX}`) {
    const url = request.nextUrl.clone();
    url.hostname = PRODUCTION_APEX;
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? '';
  if (host === PRODUCTION_APEX && proto === 'http') {
    const url = request.nextUrl.clone();
    url.hostname = PRODUCTION_APEX;
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  if (shouldBypassMiddlewareForUserAgent(request.headers.get('user-agent'))) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');

  /** Refresh session on multipart / heavy POSTs that must see a fresh cookie (avoid 401 + HTML edge). */
  const resumeApiNeedsSession =
    isApi &&
    (pathname === '/api/resume/upload' ||
      pathname === '/api/resume/parse' ||
      pathname === '/api/job-description/extract' ||
      pathname === '/api/job-description/parse' ||
      pathname.startsWith('/api/debug/'));

  // Next.js build chunks — never run Supabase session refresh here (perf + edge cache).
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/data')
  ) {
    return NextResponse.next();
  }

  // Static assets in /public (PWA icons, OG images, fonts, source maps, web app manifest).
  // Without this, these files can fall through the auth gate and 307 to /login.
  if (
    /\.(?:png|jpe?g|svg|gif|webp|ico|avif|woff2?|ttf|otf|eot|map|webmanifest)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // OAuth fallback — Supabase sometimes lands on the Site URL (`/`) with
  // ?code=... when the redirect URL isn't whitelisted in the Supabase
  // Dashboard. Forward any stray ?code= on non-callback routes to the
  // proper /auth/callback handler so login still completes.
  const code = request.nextUrl.searchParams.get('code');
  if (code && pathname !== '/auth/callback' && !isApi) {
    const callbackUrl = new URL('/auth/callback', request.url);
    callbackUrl.searchParams.set('code', code);
    const next = request.nextUrl.searchParams.get('next');
    if (next) callbackUrl.searchParams.set('next', next);
    return NextResponse.redirect(callbackUrl);
  }

  const isSeoSitemapPath =
    pathname === '/sitemap.xml' ||
    pathname === '/pages-sitemap.xml' ||
    pathname === '/blog-sitemap.xml' ||
    pathname === '/tools-sitemap.xml' ||
    pathname === '/questions-sitemap.xml';

  const isPublic =
    PUBLIC_ROUTES.has(pathname) ||
    pathname.startsWith('/tools/') ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/interview-questions') ||
    pathname === '/help' ||
    pathname === '/help-center' ||
    pathname.startsWith('/open/badges') ||
    isSeoSitemapPath;
  const needsAuthResolution =
    AUTH_ROUTES.has(pathname) || (!isPublic && !isApi) || resumeApiNeedsSession;

  // Rate limiting — checked before auth/DB calls for efficiency
  const rateConfig = RATE_LIMITS.find(([prefix]) => pathname.startsWith(prefix));
  if (rateConfig) {
    const [, limit, windowMs] = rateConfig;
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(`${ip}:${pathname}`, limit, windowMs)) {
      if (isApi) {
        const reqId = crypto.randomUUID().slice(0, 8);
        return NextResponse.json(
          {
            error: 'Too many requests. Please wait a minute and try again.',
            code: 'RATE_LIMITED',
            requestId: reqId,
          },
          { status: 429, headers: { 'Retry-After': '60', 'X-Request-Id': reqId } },
        );
      }
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }
  }

  if (!needsAuthResolution) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  // Unauthenticated user on a protected route → send to login (API returns JSON 401 from handlers)
  if (!user && !isPublic && !isApi) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user on a pure auth route → honour ?next if valid, else dashboard.
  // Preserving ?next is required so router.refresh() on the login page (after email
  // sign-in) doesn't lose the intended post-login destination.
  if (user && AUTH_ROUTES.has(pathname)) {
    const rawNext = request.nextUrl.searchParams.get('next');
    const dest =
      rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
        ? rawNext
        : '/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip middleware entirely for static chunks, image optimizer, RSC data, Vercel internals,
     * well-known files, and common asset extensions (reduces edge work + avoids bot/thumbnail 403s).
     * The `txt|xml` extensions cover robots.txt, every *-sitemap.xml (incl. questions-sitemap.xml),
     * and the IndexNow key file (<key>.txt) so crawlers fetch them with zero middleware overhead.
     * HTML document routes (/, /about, /pricing, …) still match so www→apex runs for real browsers.
     */
    '/((?!_next/static|_next/image|_next/data|_vercel/|opengraph-image\\.png|twitter-image\\.png|.*\\.(?:svg|png|jpe?g|gif|webp|ico|avif|css|js|mjs|map|txt|xml|woff2?|ttf|otf|eot)$).*)',
  ],
};
