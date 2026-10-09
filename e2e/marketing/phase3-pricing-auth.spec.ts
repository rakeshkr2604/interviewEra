import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
}

for (const viewport of viewports) {
  test(`pricing is responsive at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /Practice smarter/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Starter', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`pricing, login, and signup render in ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.addInitScript((theme) => localStorage.setItem('ie-theme', theme), colorScheme);
    await page.goto('/pricing');
    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
    // Starter and Pro both list this benefit — assert at least one is visible.
    await expect(page.getByText('One-time payment', { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/signup?next=%2Fupgrade%3Fplan%3Dstarter');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByText('Starter selected.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

for (const width of [375, 430] as const) {
  test(`login and signup are responsive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/signup?next=%2Fupgrade%3Fplan%3Dpro');
    await expect(page.getByText('Pro selected.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
