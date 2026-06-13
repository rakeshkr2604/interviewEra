import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const SESSION = 'cb4b5f0b-0c54-43b8-a70a-3b4518a054d3';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.locator('#email').click();
await page.locator('#email').fill('kanakranjan062@gmail.com');
await page.locator('#password').click();
await page.locator('#password').fill('VoiceAuditTemp!2026');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL(/dashboard|onboarding|interview|college/, { timeout: 120000, waitUntil: 'domcontentloaded' });

async function waitAnswering() {
  for (let i = 0; i < 90; i++) {
    const cont = page.getByRole('button', { name: /Continue Without Audio/i });
    if (await cont.isVisible().catch(() => false)) await cont.click();
    const body = await page.locator('body').innerText();
    if (body.includes('Your turn') || body.includes('Tap here to start microphone')) return body;
    await page.waitForTimeout(1500);
  }
  return page.locator('body').innerText();
}

await page.goto(`${BASE}/interview/session/${SESSION}`, { waitUntil: 'domcontentloaded' });
const preBody = await waitAnswering();
const s3pre = preBody.includes('Your turn') && !(/\b([1-5]?\d)s\b/.test(preBody) && !preBody.includes('Your turn'));

await page.getByRole('button', { name: 'Type answer' }).click();
await page.waitForTimeout(1500);
const ta = page.locator('textarea').first();
await ta.waitFor({ state: 'visible', timeout: 15000 });
const beforeFocus = await page.locator('body').innerText();
await ta.focus();
await page.waitForTimeout(2000);
const afterFocus = await page.locator('body').innerText();
const s3text = /\b([1-5]?\d)s\b/.test(afterFocus) && !afterFocus.includes('Your turn');

const answer = 'I chose B-tree indexes on status and created_at for our listing API, cutting p95 latency from 400ms to 40ms under peak load.';
await ta.fill(answer);

await page.getByRole('button', { name: /Submit Answer/i }).click();
await page.waitForTimeout(50000);
const postSubmit = await page.locator('body').innerText();
const s4 = /index|latency|feedback|Question 2|Analyzing|Scoring|Next question/i.test(postSubmit);

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(15000);
const restored = await page.locator('body').innerText();
const s5 = !restored.includes('Failed to load interview') && (restored.includes('B-tree') || restored.includes('latency') || restored.includes('Resume Voice') || restored.includes('Your turn'));

await page.goto(`${BASE}/history`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const hist = await page.locator('body').innerText();
const reportLink = page.locator('a[href*="/report/"]').first();
const hasReportLink = await reportLink.isVisible().catch(() => false);
let s6 = false;
if (hasReportLink) {
  const href = await reportLink.getAttribute('href');
  const resp = await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const rep = await page.locator('body').innerText();
  s6 = resp?.status() === 200 && /score|overall|performance|dimension|report/i.test(rep);
}

const uncaught = [...new Set(consoleErrors)].filter((e) => !/favicon|DevTools|404/i.test(e));

console.log(JSON.stringify({
  s3_pre_gating: s3pre,
  s3_text_timer: s3text,
  s3_pass: s3pre && s3text,
  s4_submit: s4,
  s5_draft: s5,
  s6_complete: s6 && /history|interview/i.test(hist),
  s7_console: uncaught.length === 0,
  snippets: { beforeFocus: beforeFocus.slice(0,120), afterFocus: afterFocus.slice(0,120), restored: restored.slice(0,120) },
}, null, 2));

await browser.close();
