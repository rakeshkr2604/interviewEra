import { updateSession } from '@/lib/supabase/middleware';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import { isSafePath } from '@/lib/auth/auth-params';
import { normalizeAuthErrorCode } from '@/lib/auth/auth-errors';
import {
  extractInviteTokenFromNext,
  resolvePostAuthDestination,
} from '@/lib/auth/resolve-destination';
import {
  requiresVerifiedEmailApi,
  resolveEmailVerificationAccess,
  VERIFICATION_PENDING_PATH,
} from '@/lib/auth/verified-email-policy';
import { NextResponse, type NextRequest } from 'next/server';
const AUTH_TRACE_ENABLED = process.env.IE_DIAGNOSTICS_AUTH_TRACE === '1';

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
  '/college',        // legacy marketing URL → 301 /campus (kept public for redirect edge)
  '/college/signup', // T&P officer signup form
  '/join',
  '/privacy',
  '/terms',
  '/refund',
  '/auth/callback',
  '/auth/confirm',
  '/auth/error',
  '/auth/verify-pending',
  '/teams',
  // Sitemap marketing pages — must be public for humans AND crawlers (not bots-only).
  '/community',
  '/resources',
  '/contact',
  '/google-apprenticeship',
]);
const AUTH_ROUTES = new Set(['/login', '/signup', '/auth/verify-pending']);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Redis-backed rate limiter (Upstash) — works correctly across all edge instances
// and survives cold starts.  Falls open if Redis is unavailable (see rate-limit.ts).
// [pathPrefix, requestsPerWindow, windowSeconds]
const RATE_LIMITS: [string, number, number][] = [
  ['/api/interview/answer', 60, 60],
  ['/api/interview/start',  10, 60],
  ['/api/resume/upload',     5, 60],
  ['/api/payments',         10, 60],
  ['/api/tools',             5, 60],
  ['/login',                15, 60],
  ['/signup',               10, 60],
  ['/forgot-password',       5, 60],
  ['/api/auth/forgot-password', 5, 60],
  ['/api/coach', 20, 60],
];

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

/**
 * Known crawlers / preview tooling — allowlist only (no generic `bot`/`crawler`).
 * Spoofing these UAs must NOT skip rate limits; see middleware body.
 * SEO: Googlebot, Bing, IndexNow, LinkedIn, Facebook, Twitter/X.
 * Ops: Vercel screenshots + Lighthouse (preview/CI), not SEO.
 */
function isTrustedCrawlerUserAgent(userAgent: string | null): boolean {
  const ua = (userAgent ?? '').toLowerCase();
  if (!ua) return false;
  return (
    ua.includes('googlebot') ||
    ua.includes('bingbot') ||
    ua.includes('bingpreview') ||
    ua.includes('msnbot') ||
    ua.includes('linkedinbot') ||
    ua.includes('facebookexternalhit') ||
    ua.includes('facebot') ||
    ua.includes('twitterbot') ||
    ua.includes('indexnow') ||
    ua.includes('lighthouse') ||
    ua.includes('chrome-lighthouse') ||
    ua.includes('vercel-screenshot') ||
    ua.includes('vercel-favicon') ||
    // Broader Vercel infra UA (thumbnails); rate limits still apply.
    ua.includes('vercel')
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

  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');

  if (isAuthV2Enabled() && pathname === '/college/signup') {
    const url = request.nextUrl.clone();
    if (request.nextUrl.searchParams.get('status') === 'pending') {
      url.pathname = '/college/setup';
    } else {
      url.pathname = '/signup';
      url.searchParams.set('intent', 'college');
    }
    return NextResponse.redirect(url, 301);
  }

  if (isAuthV2Enabled() && pathname === '/login') {
    const legacyError = request.nextUrl.searchParams.get('error');
    if (legacyError) {
      const errorUrl = new URL('/auth/error', request.url);
      errorUrl.searchParams.set('code', normalizeAuthErrorCode(legacyError));
      const email = request.nextUrl.searchParams.get('email');
      const next = request.nextUrl.searchParams.get('next');
      if (email) errorUrl.searchParams.set('email', email);
      if (isSafePath(next)) errorUrl.searchParams.set('next', next!);
      return NextResponse.redirect(errorUrl);
    }
  }

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
    pathname.startsWith('/college/join/') ||
    pathname === '/help' ||
    pathname === '/help-center' ||
    pathname.startsWith('/open/badges') ||
    isSeoSitemapPath;
  const hasSupabaseCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-'));

  const needsAuthResolution =
    AUTH_ROUTES.has(pathname) ||
    (!isPublic && !isApi) ||
    (isApi && hasSupabaseCookie) ||
    resumeApiNeedsSession ||
    requiresVerifiedEmailApi(pathname);

  // Rate limiting — always enforced (including for trusted-crawler UAs).
  // Spoofing Googlebot/etc. must not skip abuse protection on money/auth paths.
  const rateConfig = RATE_LIMITS.find(([prefix]) => pathname.startsWith(prefix));
  if (rateConfig) {
    const [, limit, windowSeconds] = rateConfig;
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = await checkRateLimit(`mw:${ip}:${pathname}`, windowSeconds, limit);
    if (!rl.allowed) {
      if (isApi) {
        const reqId = crypto.randomUUID().slice(0, 8);
        return NextResponse.json(
          {
            error: 'Too many requests. Please wait a minute and try again.',
            code: 'RATE_LIMITED',
            requestId: reqId,
          },
          { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds), 'X-Request-Id': reqId } },
        );
      }
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': String(rl.resetInSeconds) },
      });
    }
  }

  // Trusted crawlers: skip Supabase session refresh (edge cost) on public pages after rate limits.
  // Marketing/SEO pages are public for humans too — crawlability does not depend on this.
  if (
    isPublic &&
    isTrustedCrawlerUserAgent(request.headers.get('user-agent')) &&
    !resumeApiNeedsSession
  ) {
    return NextResponse.next();
  }

  if (!needsAuthResolution) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (AUTH_TRACE_ENABLED && (pathname === '/api/resume/upload' || pathname === '/api/activity/heartbeat')) {
    const requestCorrelationId =
      request.headers.get('x-ie-correlation-id') ??
      request.headers.get('x-vercel-id') ??
      crypto.randomUUID().slice(0, 12);
    response.headers.set('x-ie-correlation-id', requestCorrelationId);
    console.info(
      '[auth-trace][middleware]',
      JSON.stringify({
        correlation_id: requestCorrelationId,
        path: pathname,
        method: request.method,
        has_user: !!user,
        has_sb_cookie: request.cookies.getAll().some((c) => c.name.startsWith('sb-')),
      }),
    );
  }

  const verificationDecision = resolveEmailVerificationAccess({
    pathname,
    isApi,
    isPublic,
    isAuthRoute: AUTH_ROUTES.has(pathname),
    user,
  });

  if (verificationDecision === 'api_forbidden') {
    const denied = NextResponse.json(
      {
        error: 'Verify your email before using this feature.',
        code: 'EMAIL_NOT_VERIFIED',
      },
      { status: 403 },
    );
    response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
    return denied;
  }

  if (verificationDecision === 'redirect_pending' && user) {
    const pendingUrl = new URL(VERIFICATION_PENDING_PATH, request.url);
    pendingUrl.searchParams.set('email', user.email ?? '');
    pendingUrl.searchParams.set('status', 'verification_required');
    pendingUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    if (pathname.startsWith('/college')) {
      pendingUrl.searchParams.set('intent', 'college');
    }
    const redirect = NextResponse.redirect(pendingUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // Unauthenticated user on a protected route → send to login (API returns JSON 401 from handlers)
  if (!user && !isPublic && !isApi) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    if (isAuthV2Enabled()) {
      loginUrl.searchParams.set('reason', 'session_required');
    }
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (user && AUTH_ROUTES.has(pathname)) {
    const rawNext = request.nextUrl.searchParams.get('next');
    let dest = '/dashboard';
    if (isAuthV2Enabled()) {
      const inviteToken = extractInviteTokenFromNext(rawNext);
      dest = await resolvePostAuthDestination(user.id, {
        next: rawNext,
        inviteToken,
      });
    } else if (isSafePath(rawNext)) {
      dest = rawNext!;
    }
    const redirect = NextResponse.redirect(new URL(dest, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
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
