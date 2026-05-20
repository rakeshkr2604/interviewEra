import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
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

/**
 * Service-role Supabase client for API routes (bypasses RLS).
 * Uses `@supabase/supabase-js` directly — not `createServerClient` from `@supabase/ssr`,
 * which is optimized for cookie-backed user sessions and can mis-handle storage/admin
 * calls in some Node serverless runtimes.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error(
      '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (required for createServiceClient).',
    );
  }
  if (!serviceKey.startsWith('eyJ')) {
    // Service role key must be a JWT. Personal Access Tokens (sb_secret_...) do NOT work here.
    throw new Error(
      `[supabase] SUPABASE_SERVICE_ROLE_KEY is not a JWT — got prefix "${serviceKey.slice(0, 12)}...". ` +
      'Go to Supabase Dashboard → Project Settings → API → copy the "service_role" secret (starts with eyJ).',
    );
  }
  return createSupabaseJsClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
