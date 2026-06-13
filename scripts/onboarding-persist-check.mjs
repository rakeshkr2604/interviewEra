import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage();

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.locator('#email').click();
await page.locator('#email').fill('kanakranjan062@gmail.com');
await page.locator('#password').click();
await page.locator('#password').fill('VoiceAuditTemp!2026');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL(/dashboard|onboarding|interview|college/, { timeout: 120000, waitUntil: 'domcontentloaded' });

await page.request.delete(`${BASE}/api/onboarding/state`);
await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

if (await page.getByRole('button', { name: 'Back' }).isVisible().catch(() => false)) {
  await page.getByRole('button', { name: 'Back' }).click();
  await page.waitForTimeout(1500);
}

await page.getByRole('button', { name: /Fresher Placement/i }).click();
await page.getByRole('textbox', { name: 'Target role' }).fill('Smoke Audit Role');
await page.waitForTimeout(3500);

const before = await (await page.request.get(`${BASE}/api/onboarding/state`)).json();
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const after = await (await page.request.get(`${BASE}/api/onboarding/state`)).json();

const s1 =
  before?.hydration?.data?.role === 'Smoke Audit Role' &&
  after?.hydration?.data?.role === 'Smoke Audit Role';

await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
if (await page.getByRole('button', { name: 'Continue' }).isEnabled().catch(() => false)) {
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1000);
}
await page.getByRole('button', { name: 'Change' }).click();
await page.getByRole('button', { name: 'hard', exact: true }).click();
await page.waitForTimeout(3500);
const diffBefore = await (await page.request.get(`${BASE}/api/onboarding/state`)).json();
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const diffAfter = await (await page.request.get(`${BASE}/api/onboarding/state`)).json();
const s2 =
  (diffBefore?.hydration?.difficulty === 'hard' || diffBefore?.hydration?.draft?.difficulty === 'hard') &&
  (diffAfter?.hydration?.difficulty === 'hard' || diffAfter?.hydration?.draft?.difficulty === 'hard');

console.log(JSON.stringify({ s1, s2, beforeRole: before?.hydration?.data?.role, afterRole: after?.hydration?.data?.role, diffAfter: diffAfter?.hydration?.difficulty }, null, 2));
await browser.close();
