import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Playwright E2E production-safety contract', () => {
  it('registers globalTeardown next to globalSetup on both configs', () => {
    const root = readFileSync(join(process.cwd(), 'playwright.config.ts'), 'utf8');
    const staging = readFileSync(
      join(process.cwd(), 'playwright.staging.config.ts'),
      'utf8',
    );
    expect(root).toContain("globalSetup: './e2e/global-setup.ts'");
    expect(root).toContain("globalTeardown: './e2e/global-teardown.ts'");
    expect(staging).toContain("globalSetup: './e2e/global-setup.ts'");
    expect(staging).toContain("globalTeardown: './e2e/global-teardown.ts'");
  });

  it('loads the shared production guard from E2E environment bootstrap', () => {
    const envHelper = readFileSync(
      join(process.cwd(), 'e2e/helpers/e2e-environment.ts'),
      'utf8',
    );
    expect(envHelper).toContain('assertE2eSupabaseTargetNotProduction');
  });
});
