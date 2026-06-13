import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const SESSION = 'cb4b5f0b-0c54-43b8-a70a-3b4518a054d3';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ permissions: ['microphone'] });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.locator('#email').click();
await page.locator('#email').fill('kanakranjan062@gmail.com');
await page.locator('#password').click();
await page.locator('#password').fill('VoiceAuditTemp!2026');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL(/dashboard|onboarding|interview|college/, { timeout: 120000, waitUntil: 'domcontentloaded' });

await page.goto(`${BASE}/interview/session/${SESSION}`, { waitUntil: 'domcontentloaded' });
let body = '';
for (let i = 0; i < 90; i++) {
  const cont = page.getByRole('button', { name: /Continue Without Audio/i });
  if (await cont.isVisible().catch(() => false)) await cont.click();
  body = await page.locator('body').innerText();
  if (body.includes('Your turn') || body.includes('Tap here to start microphone')) break;
  await page.waitForTimeout(1500);
}

const pre = {
  yourTurn: body.includes('Your turn'),
  liveTimer: /\b([1-5]?\d)s\b/.test(body) && !body.includes('Your turn'),
};

await page.getByRole('button', { name: 'Type answer' }).first().click();
await page.waitForTimeout(1000);
const ta = page.locator('textarea').first();
let postText = { visible: false, liveTimer: false };
if (await ta.isVisible()) {
  postText.visible = true;
  await ta.focus();
  await page.waitForTimeout(2000);
  const b2 = await page.locator('body').innerText();
  postText.liveTimer = /\b([1-5]?\d)s\b/.test(b2) && !b2.includes('Your turn');
  postText.yourTurn = b2.includes('Your turn');
}

console.log(JSON.stringify({ pre, postText, pass: pre.yourTurn && !pre.liveTimer && postText.liveTimer }, null, 2));
await browser.close();
