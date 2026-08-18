import { defineConfig, devices } from '@playwright/test';
import { loadSafeStagingEnvironment } from './src/lib/env/staging-environment';

const environmentSource =
  process.env.STAGING_ENV_SOURCE === 'injected'
    ? ({ type: 'injected' } as const)
    : ({ type: 'file', path: '.env.staging.local' } as const);

loadSafeStagingEnvironment(environmentSource);

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL!.trim();

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
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
