import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  getAttributionFromRequest,
  parseAttributionFromSearchParams,
} from '@/lib/analytics/attribution';
import { trackFunnelEvent } from '@/lib/analytics/funnel';
import { sendWelcomeEmailIfNeeded } from '@/lib/email/lifecycle/send-welcome';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Prefer ?next= query param, fall back to cookie set before OAuth
  const cookieStore = await cookies();
  const cookieNext = cookieStore.get('oauth_next')?.value;
  const rawNext = searchParams.get('next') ?? (cookieNext ? decodeURIComponent(cookieNext) : null) ?? '/dashboard';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

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
        }
      }

      const redirectUrl = new URL(next, origin);
      if (!isPasswordReset) {
        redirectUrl.searchParams.set('funnel', 'signup_completed');
        redirectUrl.searchParams.set('funnel_source', 'oauth');
      }

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set('oauth_next', '', { path: '/', maxAge: 0 });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
