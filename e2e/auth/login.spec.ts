import { test, expect } from '@playwright/test';

test.describe('login page', () => {
  test('renders email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in$/i })).toBeVisible();
  });

  test('prefills email from query param', async ({ page }) => {
    await page.goto('/login?email=test%40college.edu');
    await expect(page.getByLabel(/^email$/i)).toHaveValue('test@college.edu');
  });
});
