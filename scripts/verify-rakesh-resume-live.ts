/**
 * Live browser: upload Rakesh_Kumar_Resume.pdf through Resume Workspace.
 *   npx tsx scripts/verify-rakesh-resume-live.ts
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const OUT = join(process.cwd(), '.verify-out', 'rakesh-resume');
const AUTH = join(process.cwd(), 'e2e', '.auth', 'user.json');
const PDF = join(process.cwd(), 'tests/fixtures/pdf/Rakesh_Kumar_Resume.pdf');

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { default: globalSetup } = await import('../e2e/global-setup');
  await globalSetup({} as never);
  if (!existsSync(AUTH) || !existsSync(PDF)) {
    throw new Error('Missing auth storage or Rakesh_Kumar_Resume.pdf fixture');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const notes: string[] = [];

  await page.goto(`${BASE}/resume`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(OUT, '01-before.png'), fullPage: true });

  const replaceBtn = page.getByRole('button', { name: /^Replace$/i });
  if (await replaceBtn.isVisible().catch(() => false)) {
    await replaceBtn.click();
  }

  const input = page.locator('#resume-workspace-upload');
  await input.waitFor({ state: 'attached', timeout: 15_000 });
  await input.setInputFiles(PDF);

  await page.getByRole('heading', { name: /Review extracted details/i }).waitFor({
    timeout: 120_000,
  });
  await page.screenshot({ path: join(OUT, '02-review.png'), fullPage: true });

  const role = await page.locator('#review-role').inputValue();
  const exp = await page.locator('#review-exp').inputValue();
  const body = await page.locator('body').innerText();
  notes.push(`role=${role}`);
  notes.push(`experience=${exp}`);
  notes.push(`hasReactChip=${/React/i.test(body)}`);
  notes.push(`hasNext=${/Next/i.test(body)}`);
  notes.push(`hasProjectsSection=${/Projects/i.test(body)}`);
  notes.push(`hasInterviewEraProject=${/InterviewEra/i.test(body)}`);
  notes.push(`hasSkillBridge=${/SkillBridge/i.test(body)}`);
  notes.push(`hasEducation=${/Education|Sarala|MCA|IIT/i.test(body)}`);
  notes.push(`noParseV1Placeholder=${!/Not extracted in parse-v1/i.test(body)}`);
  notes.push(`bannerUpdated=${!/not extracted yet \(parse-v1/i.test(body)}`);

  await page.getByRole('button', { name: /Confirm all/i }).click();
  await page.getByText(/edited by you|verified|Primary/i).first().waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(OUT, '03-verified.png'), fullPage: true });

  const primary = await page.locator('#primary-resume-heading').innerText().catch(() => '');
  notes.push(`primaryHeading=${primary}`);

  const ok =
    /rakesh|full.?stack|software|developer|engineer/i.test(role + primary) &&
    /React|Next|TypeScript|Node/i.test(body) &&
    /InterviewEra|SkillBridge/i.test(body) &&
    !/Not extracted in parse-v1/i.test(body);
  const report = { ok, notes, at: new Date().toISOString() };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
