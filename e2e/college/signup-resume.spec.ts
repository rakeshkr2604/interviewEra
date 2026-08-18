import { expect, test, type Page } from '@playwright/test';

async function fillAndAssert(locator: ReturnType<Page['locator']>, value: string): Promise<void> {
  await locator.fill(value);
  await expect(locator).toHaveValue(value);
}

async function currentFieldValues(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => ({
    collegeName: (document.querySelector('#college-name') as HTMLInputElement | null)?.value ?? '',
    officerName: (document.querySelector('#officer-name') as HTMLInputElement | null)?.value ?? '',
    email: (document.querySelector('#email') as HTMLInputElement | null)?.value ?? '',
    phone: (document.querySelector('#phone') as HTMLInputElement | null)?.value ?? '',
    studentCount: (document.querySelector('#student-count') as HTMLInputElement | null)?.value ?? '',
    password: (document.querySelector('#password') as HTMLInputElement | null)?.value ?? '',
  }));
}

async function submitCampusSignup(page: Page) {
  const collegeName = page.locator('#college-name');
  const officerName = page.locator('#officer-name');
  const email = page.locator('#email');
  const phone = page.locator('#phone');
  const studentCount = page.locator('#student-count');
  const password = page.locator('#password');

  const expected = {
    collegeName: 'Example Institute',
    officerName: 'Priya Sharma',
    email: 'admin@example.edu',
    phone: '+91 9876543210',
    studentCount: '120',
    password: 'ValidPass1!',
  } as const;

  // Initial pass.
  await fillAndAssert(officerName, expected.officerName);
  await fillAndAssert(email, expected.email);
  await fillAndAssert(phone, expected.phone);
  await fillAndAssert(studentCount, expected.studentCount);
  await fillAndAssert(password, expected.password);
  await fillAndAssert(collegeName, expected.collegeName);

  // Deterministic stabilization pass: re-apply only fields that drifted.
  const current = await currentFieldValues(page);
  if (current.collegeName !== expected.collegeName) {
    await fillAndAssert(collegeName, expected.collegeName);
  }
  if (current.officerName !== expected.officerName) {
    await fillAndAssert(officerName, expected.officerName);
  }
  if (current.email !== expected.email) {
    await fillAndAssert(email, expected.email);
  }
  if (current.phone !== expected.phone) {
    await fillAndAssert(phone, expected.phone);
  }
  if (current.studentCount !== expected.studentCount) {
    await fillAndAssert(studentCount, expected.studentCount);
  }
  if (current.password !== expected.password) {
    await fillAndAssert(password, expected.password);
  }

  await page.getByRole('button', { name: /create account and verify email/i }).click();
}

async function mockSignupAndRejectPrematureOrg(page: Page) {
  let createOrgCalls = 0;

  await page.route('**/api/auth/signup*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        userId: '11111111-1111-4111-8111-111111111111',
        needsVerification: true,
        message: 'Account created! Check your email to verify before signing in.',
      }),
    });
  });
  await page.route('**/api/college/create-org*', async (route) => {
    createOrgCalls += 1;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Premature create-org call detected.' }),
    });
  });

  return () => createOrgCalls;
}

test.describe('campus signup verification continuation', () => {
  test('Auth V2 campus signup waits for verification before create-org', async ({ page }) => {
    const createOrgCalls = await mockSignupAndRejectPrematureOrg(page);

    await page.goto('/signup?intent=college');
    await submitCampusSignup(page);

    await expect(
      page.getByRole('heading', { name: /verify your email to continue campus setup/i }),
    ).toBeVisible();
    expect(createOrgCalls()).toBe(0);

    const url = new URL(page.url());
    expect(url.searchParams.get('next')).toBe('/college/setup?status=verified');
  });

  test('legacy campus signup waits for verification when legacy route is active', async ({ page }) => {
    const createOrgCalls = await mockSignupAndRejectPrematureOrg(page);

    await page.goto('/college/signup');
    test.skip(
      new URL(page.url()).pathname === '/signup',
      'Auth V2 redirects the legacy URL to the active campus signup surface.',
    );

    await submitCampusSignup(page);

    expect(createOrgCalls()).toBe(0);
  });
});
