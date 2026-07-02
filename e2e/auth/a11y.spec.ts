import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const AUTH_ROUTES = ['/login', '/signup', '/auth/error?code=invalid_credentials'];

for (const route of AUTH_ROUTES) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
