/**
 * Login via /login form and verify GET /api/interview/[id] + session hydration.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const INTERVIEW_ID = 'cb4b5f0b-0c54-43b8-a70a-3b4518a054d3';
const EMAIL = 'kanakranjan062@gmail.com';
const PASSWORD = 'VoiceAuditTemp!2026';

const logs = [];
const apiResponses = [];

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext();
const page = await context.newPage();

page.on('response', async (res) => {
  if (res.url().includes('/api/interview/')) {
    apiResponses.push({ url: res.url(), status: res.status(), body: await res.text().catch(() => '') });
  }
});
page.on('console', (msg) => {
  const t = msg.text();
  if (t.includes('[STT_INPUT_TRACE]') || t.includes('Failed to load') || t.includes('interview_loaded')) logs.push(t);
});

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.locator('#email').click();
await page.locator('#email').fill(EMAIL);
await page.locator('#password').click();
await page.locator('#password').fill(PASSWORD);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL(/dashboard|onboarding|interview|college/, { timeout: 60000 });
console.log('After login URL:', page.url());

const cookies = await context.cookies();
console.log('sb cookies after login:', cookies.filter((c) => c.name.startsWith('sb-')).map((c) => c.name));

const apiProbe = await page.evaluate(async (id) => {
  const res = await fetch(`/api/interview/${id}`);
  return { status: res.status, body: await res.text() };
}, INTERVIEW_ID);
console.log('API probe after login:', apiProbe);

await page.goto(`${BASE}/interview/session/${INTERVIEW_ID}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(12000);

const body = await page.locator('body').innerText();
console.log('Session page snippet:', body.slice(0, 400));
console.log('Has Failed to load:', body.includes('Failed to load interview'));
console.log('Has Your Answer:', body.includes('Your Answer'));
console.log('Has Loading:', body.includes('Loading your interview'));

console.log('API responses during session load:');
console.log(JSON.stringify(apiResponses, null, 2));

await page.screenshot({ path: '.voice-verify-out/session-after-login.png', fullPage: true });
await browser.close();
