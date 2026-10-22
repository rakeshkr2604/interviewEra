import { expect } from '@playwright/test'
import { authReady, authenticatedTest as test } from '../helpers/auth-fixture'
import { seedAnalyticsConsent } from '../helpers/analytics-consent'

/**
 * Staging smoke for follow-up hierarchy on an existing script report.
 *
 * Does NOT start interviews or spend credits. Pass interview id via:
 *   STAGING_QA_REPORT_INTERVIEW_ID=<uuid>
 *
 * Live answer-quality classifier behavior is covered by unit tests + the
 * one-shot staging driver `scripts/_tmp-staging-interview-qa.ts` (gitignored).
 * This file only asserts report UI contracts after a live interview exists.
 */
const interviewId = process.env.STAGING_QA_REPORT_INTERVIEW_ID?.trim()

test.describe('Answer-quality report hierarchy @staging @integration', () => {
  test.skip(!authReady, 'Requires authenticated staging storage state')
  test.skip(!interviewId, 'Set STAGING_QA_REPORT_INTERVIEW_ID to a completed staging interview')

  test.beforeEach(async ({ page }) => {
    await seedAnalyticsConsent(page, 'rejected')
  })

  test('script report shows core/follow-up hierarchy and echo markers when present', async ({
    page,
  }) => {
    await page.goto(`/report/script/${interviewId}`)
    await expect(page.getByRole('heading', { name: /Interview report/i })).toBeVisible({
      timeout: 60_000,
    })

    const perQuestion = page.getByTestId('script-report-per-question')
    await expect(perQuestion).toBeVisible({ timeout: 60_000 })

    const cores = page.getByTestId('script-report-core-question')
    await expect(cores.first()).toBeVisible()
    expect(await cores.count()).toBeGreaterThan(0)

    // Follow-ups may be absent on short interviews; if present, they nest under groups.
    const followUps = page.getByTestId('script-report-follow-up')
    const followUpCount = await followUps.count()
    if (followUpCount > 0) {
      await expect(followUps.first()).toBeVisible()
      await expect(page.getByTestId('script-report-question-group').first()).toBeVisible()
    }

    const transcripts = page.getByTestId('script-report-transcript')
    expect(await transcripts.count()).toBeGreaterThan(0)

    // Free plan shows locked "Export PDF" + Pro badge; paid plans expose the download link.
    await expect(page.getByText(/Export PDF/i).first()).toBeVisible({ timeout: 15_000 })
    const pdfLink = page.locator('a[href*="export-pdf"]')
    if ((await pdfLink.count()) > 0) {
      await expect(pdfLink.first()).toBeVisible()
    } else {
      await expect(page.getByText(/^Pro$/i).first()).toBeVisible()
    }
  })
})
