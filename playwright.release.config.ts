import { defineConfig, devices } from '@playwright/test';
import { resolvePlaywrightBaseUrl } from './src/lib/e2e/playwright-base-url';

const baseURL = resolvePlaywrightBaseUrl(process.env);

/** Release validation — production server, all three browser engines. */
export default defineConfig({
  testDir: './e2e/marketing',
  testMatch: /release-validation\.spec\.ts/,
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 120_000,
  reporter: [['list'], ['json', { outputFile: 'validation-results/playwright-report.json' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
