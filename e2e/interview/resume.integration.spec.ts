import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { devices, expect } from '@playwright/test';
import { authenticatedTest as test } from '../helpers/auth-fixture';
import { integrationReady } from '../helpers/integration-ready';
import {
  deleteInterviewFixture,
  readResumeSnapshot,
  resolveE2eUserId,
  seedResumableInterview,
  type SeededInterviewFixture,
} from '../helpers/integration-interview-seed';
import { Q3_QUESTION_TEXT } from '../helpers/interview-resume-mocks';

const STORAGE_PATH = join(process.cwd(), 'e2e', '.auth', 'user.json');

test.describe('Interview resume live @integration', () => {
  test.skip(!integrationReady, 'Requires real Supabase + E2E auth');
  test.skip(!existsSync(STORAGE_PATH), 'Requires E2E auth storage state');

  let fixture: SeededInterviewFixture;

  test.beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = await resolveE2eUserId(admin);
    fixture = await seedResumableInterview(userId);
  });

  test.afterAll(async () => {
    if (fixture?.interviewId) {
      await deleteInterviewFixture(fixture.interviewId, fixture.resumeId);
    }
  });

  test('checkpoint written on laptop is restored on mobile via real API + DB', async ({ browser }) => {
    const transcript = `E2E cross-device ${Date.now()}`;

    const laptop = await browser.newContext({
      storageState: STORAGE_PATH,
      ...devices['Desktop Chrome'],
    });
    const laptopPage = await laptop.newPage();

    await laptopPage.goto(`/interview/session/${fixture.interviewId}`);
    await expect(laptopPage.getByText(Q3_QUESTION_TEXT)).toBeVisible({ timeout: 30_000 });
    const checkpointDone = laptopPage.waitForResponse(
      (response) =>
        response.url().includes(`/api/interview/${fixture.interviewId}/checkpoint`) &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 15_000 },
    );
    await laptopPage.locator('textarea').first().fill(transcript);
    await checkpointDone;
    await laptop.close();

    const snap = await readResumeSnapshot(fixture.interviewId);
    expect(snap?.transcript).toContain(transcript);
    expect(snap?.questionIndex).toBe(2);

    const mobile = await browser.newContext({
      storageState: STORAGE_PATH,
      ...devices['Pixel 5'],
    });
    const mobilePage = await mobile.newPage();

    await mobilePage.goto('/');
    const draftCount = await mobilePage.evaluate(
      () => Object.keys(localStorage).filter((k) => k.startsWith('ie-interview-draft:')).length,
    );
    expect(draftCount).toBe(0);

    await mobilePage.goto(`/interview/session/${fixture.interviewId}`);
    await expect(mobilePage.getByText(Q3_QUESTION_TEXT)).toBeVisible({ timeout: 30_000 });
    await expect(mobilePage.locator('textarea').first()).toHaveValue(new RegExp(transcript), {
      timeout: 15_000,
    });
    await mobile.close();
  });
});
