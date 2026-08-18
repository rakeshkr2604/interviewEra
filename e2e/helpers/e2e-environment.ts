import { join } from 'node:path';
import { config } from 'dotenv';
import { assertSafeStagingEnvironment } from '../../src/lib/env/staging-environment';
import { assertE2eSupabaseTargetNotProduction } from '../../src/lib/e2e/target-guard';

export function loadSelectedE2eEnvironment(): void {
  if (process.env.E2E_ENVIRONMENT === 'staging') {
    assertSafeStagingEnvironment(process.env);
    assertE2eSupabaseTargetNotProduction(process.env.NEXT_PUBLIC_SUPABASE_URL);
    return;
  }

  config({ path: join(process.cwd(), '.env.local') });
  assertE2eSupabaseTargetNotProduction(process.env.NEXT_PUBLIC_SUPABASE_URL);
}
