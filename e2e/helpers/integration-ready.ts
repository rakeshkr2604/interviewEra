import { authReady } from './auth-fixture';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

export const integrationReady =
  authReady &&
  supabaseUrl.length > 0 &&
  !supabaseUrl.includes('placeholder') &&
  serviceKey.length > 0 &&
  !serviceKey.includes('placeholder');
