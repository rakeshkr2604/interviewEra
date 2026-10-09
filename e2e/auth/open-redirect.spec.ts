import { test, expect } from '@playwright/test';

test.describe('open redirect guards', () => {
  test('login page does not expose unsafe next in client navigation', async ({ page }) => {
    await page.goto('/login?next=javascript%3Aalert(1)');
    await expect(page).toHaveURL(/\/login/);
  });

  test('auth callback rejects protocol-relative next', async ({ request, baseURL }) => {
    // Use the request API: some Chromium builds fail page.goto when a query
    // value decodes to a protocol-relative URL, even after encodeURIComponent.
    const response = await request.get(
      `${baseURL}/auth/callback?next=${encodeURIComponent('//evil.com')}`,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBeLessThan(500);
    const location = response.headers().location ?? '';
    expect(location).not.toMatch(/evil\.com/i);
    expect(location).toMatch(/\/(auth\/error|login)/);
  });
});
