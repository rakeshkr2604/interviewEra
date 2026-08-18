import { join } from 'node:path';
import { config } from 'dotenv';
import { assertSafeStagingEnvironment } from '../../src/lib/env/staging-environment';

export function loadSelectedE2eEnvironment(): void {
  if (process.env.E2E_ENVIRONMENT === 'staging') {
    assertSafeStagingEnvironment(process.env);
    return;
  }

  config({ path: join(process.cwd(), '.env.local') });
}
