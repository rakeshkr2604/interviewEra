import { defineConfig, devices } from '@playwright/test';
import { resolvePlaywrightBaseUrl } from './src/lib/e2e/playwright-base-url';
import { loadSafeStagingEnvironment } from './src/lib/env/staging-environment';

const environmentSource =
  process.env.STAGING_ENV_SOURCE === 'injected'
    ? ({ type: 'injected' } as const)
    : ({ type: 'file', path: '.env.staging.local' } as const);

loadSafeStagingEnvironment(environmentSource);

const baseURL = resolvePlaywrightBaseUrl(process.env);

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'staging-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command:
      process.env.CI || process.env.E2E_WEB_SERVER === 'start'
        ? 'npx tsx scripts/perf/with-staging-env.ts npm run start'
        : 'npm run dev',
    url: baseURL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
    timeout: 120_000,
  },
});
