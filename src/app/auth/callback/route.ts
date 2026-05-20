import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      // Clear the oauth_next cookie
      response.cookies.set('oauth_next', '', { path: '/', maxAge: 0 });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
