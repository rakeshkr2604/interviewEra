import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  getAttributionFromRequest,
  parseAttributionFromSearchParams,
} from '@/lib/analytics/attribution';
import { trackFunnelEvent } from '@/lib/analytics/funnel';
import { sendWelcomeEmailIfNeeded } from '@/lib/email/lifecycle/send-welcome';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import { isSafePath, sanitizeNext } from '@/lib/auth/auth-params';
import {
  extractInviteTokenFromNext,
  resolvePostAuthDestination,
} from '@/lib/auth/resolve-destination';
import { captureReferralFromCode } from '@/lib/referral/capture-referral';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  const cookieStore = await cookies();
  const cookieNext = cookieStore.get('oauth_next')?.value;
  const rawNext = searchParams.get('next') ?? (cookieNext ? decodeURIComponent(cookieNext) : null) ?? '/dashboard';
  const next = isSafePath(rawNext) ? rawNext : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
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
      response.cookies.set('oauth_next', '', { path: '/', maxAge: 0 });
      response.cookies.set('auth_intent', '', { path: '/', maxAge: 0 });
      return response;
    }
  }

  if (isAuthV2Enabled()) {
    return NextResponse.redirect(`${origin}/auth/error?code=auth_callback_failed`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
