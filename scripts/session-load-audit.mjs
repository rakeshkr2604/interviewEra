/**
 * Diagnose GET /api/interview/[id] with magic-link auth cookies.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3000';
const INTERVIEW_ID = 'cb4b5f0b-0c54-43b8-a70a-3b4518a054d3';

function loadEnv() {
  const raw = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
  return Object.fromEntries(
    raw
      .split(/\n/)
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
}

async function getMagicLink(env, email) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email,
      options: { redirectTo: `${BASE}/auth/callback?next=/interview/session/${INTERVIEW_ID}` },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json.action_link || json.properties?.action_link;
}

const env = loadEnv();
const email = 'kanakranjan062@gmail.com';
const magicLink = await getMagicLink(env, email);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext();
const page = await context.newPage();

const apiResponses = [];
page.on('response', async (res) => {
  if (res.url().includes('/api/interview/')) {
    apiResponses.push({
      url: res.url(),
      status: res.status(),
      body: await res.text().catch(() => ''),
    });
  }
});

console.log('1. Magic link auth...');
await page.goto(magicLink, { waitUntil: 'networkidle', timeout: 90000 });
console.log('   URL after auth:', page.url());

console.log('2. Direct API from browser context...');
const apiResult = await page.evaluate(async (id) => {
  const res = await fetch(`/api/interview/${id}`);
  return { status: res.status, body: await res.text() };
}, INTERVIEW_ID);
console.log('   API result:', apiResult);

console.log('3. Cookies in context...');
const cookies = await context.cookies();
const sbCookies = cookies.filter((c) => c.name.startsWith('sb-'));
console.log('   sb-* cookies:', sbCookies.map((c) => ({ name: c.name, domain: c.domain, path: c.path })));

console.log('4. Wait for page loadInterview...');
await page.waitForTimeout(5000);
console.log('   Final URL:', page.url());
console.log('   Body snippet:', (await page.locator('body').innerText()).slice(0, 300));

console.log('5. Captured API responses during navigation:');
console.log(JSON.stringify(apiResponses, null, 2));

await browser.close();
