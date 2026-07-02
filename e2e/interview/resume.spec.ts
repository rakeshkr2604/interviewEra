import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { devices, expect } from '@playwright/test';
import { authenticatedTest as test, authReady } from '../helpers/auth-fixture';
import {
  MOCK_INTERVIEW_ID,
  clearInterviewDraftInitScript,
  expectResumedQuestionThree,
  installResumeRoutes,
  mockResumePayload,
} from '../helpers/interview-resume-mocks';

const STORAGE_PATH = join(process.cwd(), 'e2e', '.auth', 'user.json');

test.describe('Interview resume from History', () => {
  test.skip(!authReady, 'Requires E2E auth provisioning');

  test.describe('mocked session restore', () => {
    test.beforeEach(async ({ page }) => {
      const store = {
        resumeSnapshot: { ...mockResumePayload.resumeSnapshot, updatedAt: new Date().toISOString() },
      };

      await page.addInitScript(clearInterviewDraftInitScript());
      await installResumeRoutes(page, store);
    });

    test('resume after refresh shows Question 3 and prior transcript', async ({ page }) => {
      await page.goto(`/interview/session/${MOCK_INTERVIEW_ID}`);
      await expectResumedQuestionThree(page);

      await page.reload();
      await expectResumedQuestionThree(page);
    });

    test('resume after clearing local draft still restores from server checkpoint', async ({ page }) => {
      await page.goto(`/interview/session/${MOCK_INTERVIEW_ID}`);
      await expectResumedQuestionThree(page);

      await page.evaluate(clearInterviewDraftInitScript());
      await page.reload();
      await expectResumedQuestionThree(page);
    });
  });

  test('resume on a second device continues from Question 3', async ({ browser }) => {
    test.skip(!existsSync(STORAGE_PATH), 'Requires E2E auth storage state');

    const store = {
      resumeSnapshot: {
        ...mockResumePayload.resumeSnapshot,
        transcript: '',
        updatedAt: new Date().toISOString(),
      },
    };
    const transcript = 'I led a migration project…';

    const laptop = await browser.newContext({
      storageState: STORAGE_PATH,
      ...devices['Desktop Chrome'],
    });
    const laptopPage = await laptop.newPage();
    await installResumeRoutes(laptopPage, store);

    await laptopPage.goto(`/interview/session/${MOCK_INTERVIEW_ID}`);
    await expect(laptopPage.getByText('How do you handle conflict?')).toBeVisible({ timeout: 30_000 });
    await laptopPage.locator('textarea').first().fill(transcript);
    await laptopPage.waitForTimeout(500);
    await laptop.close();

    const mobile = await browser.newContext({
      storageState: STORAGE_PATH,
      ...devices['Pixel 5'],
    });
    const mobilePage = await mobile.newPage();
    await installResumeRoutes(mobilePage, store);

    await mobilePage.goto('/');
    const draftCount = await mobilePage.evaluate(
      () => Object.keys(localStorage).filter((k) => k.startsWith('ie-interview-draft:')).length,
    );
    expect(draftCount).toBe(0);

    await mobilePage.goto(`/interview/session/${MOCK_INTERVIEW_ID}`);
    await expect(mobilePage.getByText('How do you handle conflict?')).toBeVisible({ timeout: 30_000 });
    await expect(mobilePage.locator('textarea').first()).toHaveValue(/I led a migration project/, {
      timeout: 15_000,
    });
    await mobile.close();
  });

  test('checkpoint endpoint requires authentication', async ({ request }) => {
    const res = await request.post(`/api/interview/${MOCK_INTERVIEW_ID}/checkpoint`, {
      data: {
        questionIndex: 2,
        phase: 'candidate_answering',
        transcript: 'test',
        timerRemaining: 50,
        timerBudget: 60,
        skipCount: 0,
        pendingFollowUp: null,
        inputMode: 'text',
        followUpForIndex: -1,
      },
    });
    expect([401, 404]).toContain(res.status());
  });
});
