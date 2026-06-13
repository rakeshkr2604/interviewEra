import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = 'kanakranjan062@gmail.com';
const PASSWORD = 'VoiceAuditTemp!2026';
const SESSION = 'cb4b5f0b-0c54-43b8-a70a-3b4518a054d3';

const consoleErrors = [];
const results = {};

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ permissions: ['microphone'] });
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));

async function login() {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#email').click();
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').click();
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard|onboarding|interview|college/, {
    timeout: 120000,
    waitUntil: 'domcontentloaded',
  });
}

function answeringSignals(body) {
  return (
    body.includes('Tap here to start microphone') ||
    body.includes('Your turn') ||
    body.includes('Type your answer here')
  );
}

await login();

try {
  await page.request.delete(`${BASE}/api/onboarding/state`);
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  if (await page.getByRole('button', { name: 'Back' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Back' }).click();
    await page.waitForTimeout(1000);
  }
  await page.getByRole('button', { name: /Fresher Placement/i }).click();
  await page.getByLabel('Target role').fill('Smoke Audit Role');
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const onStep1 = await page.getByRole('button', { name: 'Continue' }).isVisible().catch(() => false);
  if (onStep1) {
    const role = await page.getByLabel('Target role').inputValue();
    const goal =
      (await page.getByRole('button', { name: /Fresher Placement/i }).getAttribute('aria-pressed')) === 'true';
    results.s1 = role === 'Smoke Audit Role' && goal;
  } else {
    const draftRes = await page.request.get(`${BASE}/api/onboarding/state`);
    const draftJson = await draftRes.json().catch(() => ({}));
    const role = draftJson?.draft?.role ?? draftJson?.hydration?.data?.role;
    results.s1 = role === 'Smoke Audit Role';
    results.s1_detail = { viaApi: true, role, step: draftJson?.draft?.step };
  }
} catch (e) {
  results.s1 = false;
  results.s1_err = String(e);
}

try {
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  if (await page.getByRole('button', { name: 'Continue' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(1000);
  }
  await page.getByRole('button', { name: 'Change' }).click();
  await page.getByRole('button', { name: 'hard', exact: true }).click();
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const body = await page.locator('body').innerText();
  results.s2 = /\bhard\b/i.test(body);
} catch (e) {
  results.s2 = false;
  results.s2_err = String(e);
}

try {
  await page.goto(`${BASE}/interview/session/${SESSION}`, { waitUntil: 'domcontentloaded' });
  let body = '';
  for (let i = 0; i < 120; i++) {
    const cont = page.getByRole('button', { name: /Continue Without Audio/i });
    if (await cont.isVisible().catch(() => false)) await cont.click();
    body = await page.locator('body').innerText();
    if (answeringSignals(body)) break;
    await page.waitForTimeout(1500);
  }

  const yourTurn = body.includes('Your turn');
  const timerLive = /\b([1-5]?\d)s\b/.test(body) && !yourTurn;
  results.s3_before = { yourTurn, timerLive, signals: answeringSignals(body) };

  let voiceTimer = false;
  if (body.includes('Tap here to start microphone')) {
    await page.getByRole('button', { name: 'Tap here to start microphone' }).click();
    await page.waitForTimeout(12000);
    const after = await page.locator('body').innerText();
    voiceTimer =
      (/\b\d+s\b/.test(after) && !after.includes('Your turn')) || after.includes('Listening');
    results.s3_voice = after.slice(0, 200);
  }

  await page.getByRole('button', { name: 'Type answer' }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  const ta = page.locator('textarea').first();
  let textTimer = false;
  if (await ta.isVisible().catch(() => false)) {
    const b1 = await page.locator('body').innerText();
    await ta.focus();
    await page.waitForTimeout(1500);
    const b2 = await page.locator('body').innerText();
    textTimer = /\b\d+s\b/.test(b2) && !b2.includes('Your turn');
    results.s3_text = { before: b1.includes('Your turn'), afterTimer: textTimer };
    await ta.fill('Smoke audit answer about database indexing and query optimization.');
  }
  results.s3 = yourTurn && !timerLive && (voiceTimer || textTimer);

  await page.getByRole('button', { name: /Submit Answer/i }).click();
  await page.waitForTimeout(45000);
  const afterSubmit = await page.locator('body').innerText();
  results.s4 =
    afterSubmit.includes('indexing') ||
    afterSubmit.includes('Question 2') ||
    afterSubmit.toLowerCase().includes('score') ||
    afterSubmit.includes('speaking');
  results.s4_snip = afterSubmit.slice(0, 300);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(12000);
  const ref = await page.locator('body').innerText();
  results.s5 =
    !ref.includes('Failed to load interview') &&
    (ref.includes('indexing') ||
      ref.includes('Resume Voice') ||
      ref.includes('Your turn') ||
      answeringSignals(ref));
  results.s5_snip = ref.slice(0, 250);
} catch (e) {
  results.s3 = false;
  results.interview_err = String(e);
}

try {
  await page.goto(`${BASE}/history`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const hist = await page.locator('body').innerText();
  results.s6_history = /interview|completed|session|score/i.test(hist);
  const link = page.locator('a[href*="/report/"]').first();
  if (await link.isVisible().catch(() => false)) {
    const href = await link.getAttribute('href');
    if (href) {
      await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      const rep = await page.locator('body').innerText();
      results.s6_report =
        page.url().includes('/report/') && /score|overall|performance|report/i.test(rep);
    }
  } else {
    results.s6_report = false;
  }
  results.s6 = Boolean(results.s6_history && results.s6_report);
} catch (e) {
  results.s6 = false;
  results.s6_err = String(e);
}

const uncaught = [...new Set(consoleErrors)].filter(
  (e) => !/favicon|DevTools|404/i.test(e),
);
results.s7 = uncaught.length === 0;
results.s7_uncaught = uncaught.slice(0, 5);

console.log(
  JSON.stringify(
    {
      '1_new_interview_step1_refresh': results.s1 ? 'PASS' : 'FAIL',
      '2_step2_difficulty_refresh': results.s2 ? 'PASS' : 'FAIL',
      '3_timer_gating': results.s3 ? 'PASS' : 'FAIL',
      '4_voice_interview': results.s4 ? 'PASS' : 'FAIL',
      '5_refresh_draft_restore': results.s5 ? 'PASS' : 'FAIL',
      '6_complete_interview': results.s6 ? 'PASS' : 'FAIL',
      '7_browser_console': results.s7 ? 'PASS' : 'FAIL',
      details: results,
    },
    null,
    2,
  ),
);

await browser.close();
