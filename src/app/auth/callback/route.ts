import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  getAttributionFromRequest,
  parseAttributionFromSearchParams,
} from '@/lib/analytics/attribution';
import { persistUserAttributionOnce } from '@/lib/analytics/persist-user-attribution';
import { trackFunnelEvent } from '@/lib/analytics/funnel';
import { sendWelcomeEmailIfNeeded } from '@/lib/email/lifecycle/send-welcome';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import { isSafePath, sanitizeNext } from '@/lib/auth/auth-params';
import {
  extractInviteTokenFromNext,
  resolvePostAuthDestination,
} from '@/lib/auth/resolve-destination';
import { captureReferralFromCode } from '@/lib/referral/capture-referral';
import { persistSignupConsent } from '@/lib/legal/persist-signup-consent';
import {
  SIGNUP_CONSENT_COOKIE,
  parseSignupConsentCookie,
} from '@/lib/legal/signup-consent';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CookieWrite = { name: string; value: string; options: Record<string, unknown> };

/** Copy session cookies onto the redirect response (Next.js does not auto-merge cookies().set → NextResponse.redirect). */
function applyCookiesToResponse(response: NextResponse, writes: CookieWrite[]): void {
  for (const { name, value, options } of writes) {
    response.cookies.set(name, value, options);
  }
}

/**
 * Allow @supabase/supabase-js auth state notifications to flush cookie writes
 * before the handler returns (deferred via microtask in recent auth-js versions).
 */
async function flushAuthCookieWrites(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  const cookieStore = await cookies();
  const cookieNext = cookieStore.get('oauth_next')?.value;
  const rawNext =
    searchParams.get('next') ??
    (cookieNext ? decodeURIComponent(cookieNext) : null) ??
    '/dashboard';
  const next = isSafePath(rawNext) ? rawNext : '/dashboard';

  if (code) {
    const sessionCookieWrites: CookieWrite[] = [];
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Route handlers may reject duplicate sets; outgoing response is authoritative.
              }
              sessionCookieWrites.push({ name, value, options });
            });
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    await flushAuthCookieWrites();

    if (!error) {
      const userId = data.user?.id;
      const isPasswordReset = next === '/reset-password';

      if (!isPasswordReset) {
        const attribution = {
          ...getAttributionFromRequest(request),
          ...parseAttributionFromSearchParams(searchParams),
        };

        trackFunnelEvent(
          'signup_completed',
          { userId, source: 'oauth', method: 'oauth' },
          { ga4: false, attribution },
        );

        if (userId) {
          await persistUserAttributionOnce(createServiceClient(), userId, attribution).catch(
            (err) => {
              console.error('[auth/callback] attribution persistence failed:', err);
            },
          );

          void sendWelcomeEmailIfNeeded(userId).catch((err) => {
            console.error('[auth/callback] welcome email failed:', err);
          });

          const referralCode = cookieStore.get('referral_code')?.value;
          if (referralCode) {
            void captureReferralFromCode(createServiceClient(), userId, referralCode).catch(
              (err) => {
                console.warn('[auth/callback] referral capture failed:', err);
              },
            );
          }

          const signupConsent = parseSignupConsentCookie(
            cookieStore.get(SIGNUP_CONSENT_COOKIE)?.value,
          );
          if (signupConsent) {
            void persistSignupConsent(createServiceClient(), userId, signupConsent).catch(
              (err) => {
                console.error('[auth/callback] signup consent persist failed:', err);
              },
            );
          }
        }
      }

      let destination = next;
      if (isAuthV2Enabled() && userId && !isPasswordReset) {
        const inviteToken = extractInviteTokenFromNext(next);
        destination = await resolvePostAuthDestination(userId, { next, inviteToken });
      } else if (!isSafePath(rawNext)) {
        destination = sanitizeNext(null);
      }

      const redirectUrl = new URL(destination, origin);
      if (!isPasswordReset) {
        redirectUrl.searchParams.set('funnel', 'signup_completed');
        redirectUrl.searchParams.set('funnel_source', 'oauth');
      }

      const response = NextResponse.redirect(redirectUrl);
      applyCookiesToResponse(response, sessionCookieWrites);
      response.cookies.set('oauth_next', '', { path: '/', maxAge: 0 });
      response.cookies.set('auth_intent', '', { path: '/', maxAge: 0 });
      response.cookies.set(SIGNUP_CONSENT_COOKIE, '', { path: '/', maxAge: 0 });
      return response;
    }
  }

  if (isAuthV2Enabled()) {
    return NextResponse.redirect(`${origin}/auth/error?code=auth_callback_failed`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
