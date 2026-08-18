import { createClient } from '@supabase/supabase-js';
import { loadSelectedE2eEnvironment } from './helpers/e2e-environment';
import { destroyEphemeralE2eUserIfPresent } from '../src/lib/e2e/user-lifecycle';

export default async function globalTeardown(): Promise<void> {
  loadSelectedE2eEnvironment();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey || url.includes('placeholder') || serviceKey.includes('placeholder')) {
    console.log('[e2e teardown] skip destroy; placeholder or missing credentials');
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await destroyEphemeralE2eUserIfPresent(admin);
}
