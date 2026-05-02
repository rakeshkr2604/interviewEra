import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const supabaseCookiesStripped =
    headerList.get('x-ie-sb-cookies-stripped') === '1';

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = cookieStore.getAll();
          if (supabaseCookiesStripped) {
            return all.filter(({ name }) => !name.startsWith('sb-'));
          }
          return all;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components can read cookies but not set them. Session refresh
            // runs in middleware (updateSession) on the next request.
          }
        },
      },
    }
  );
}

// Service client bypasses RLS — use only in API routes after manual auth validation.
// No-op cookie handlers: service role key doesn't need session cookies.
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
