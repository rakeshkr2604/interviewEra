import { test, expect } from '@playwright/test';

test.describe('Interview session guards', () => {
  test('legacy session page requires authentication (redirects to login)', async ({ page }) => {
    await page.goto('/interview/session/00000000-0000-4000-8000-000000000001', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });

  test('redirects unauthenticated users from report page', async ({ page }) => {
    await page.goto('/report/00000000-0000-4000-8000-000000000001');
    await expect(page).toHaveURL(/\/login/);
  });

  test('legacy /interview/new redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/interview/new');
    await expect(page).toHaveURL(/\/login/);
  });

  test('script start requires authentication', async ({ page }) => {
    await page.goto('/interview/script/start', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });
});

test.describe('Interview API auth', () => {
  test('script start endpoint requires authentication', async ({ request }) => {
    const res = await request.post('/api/interview/script/start', {
      data: {
        resumeId: '00000000-0000-4000-8000-000000000001',
        role: 'Software Engineer',
        difficulty: 'medium',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('complete endpoint requires authentication', async ({ request }) => {
    const res = await request.post('/api/interview/complete', {
      data: { interviewId: '00000000-0000-4000-8000-000000000001' },
    });
    expect(res.status()).toBe(401);
  });

  test('abandon endpoint requires authentication', async ({ request }) => {
    const res = await request.post('/api/interview/00000000-0000-4000-8000-000000000001/abandon');
    expect(res.status()).toBe(401);
  });
});
