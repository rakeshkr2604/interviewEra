import { expect, test } from '@playwright/test'

test.describe('free interview preparation toolkit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/resources')
    const reject = page.getByRole('button', { name: 'Reject analytics' })
    if (await reject.isVisible().catch(() => false)) {
      await reject.click()
    }
  })

  test('resources hub stays the public guide library', async ({ page }) => {
    await expect(page).toHaveURL(/\/resources$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Interview Preparation Resources' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Featured Guides' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Prepare Before Your Mock Interview' })).toHaveCount(0)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/resources$/)
  })

  test('interview prep workspace requires login', async ({ page }) => {
    await page.goto('/prepare')
    await expect(page).toHaveURL(/\/login/)
  })

  test('prompt builder validates, generates, copies, and resets', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/resources/chatgpt-interview-preparation')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { level: 1, name: /How to Use ChatGPT for Interview Preparation/i })).toBeVisible()

    // Scoped to the PromptBuilder form itself (not `page`). This test has
    // intermittently failed in CI with "strict mode violation: resolved to 2
    // elements" on unscoped getByText/getByLabel calls — not reproducible
    // locally (20+ runs against both dev and the exact CI build/env, with and
    // without CPU throttling) and no second literal source of this copy
    // exists in the codebase, so the live duplicate-render cause is still
    // unconfirmed. Scoping every PromptBuilder-specific query to its own
    // <form> removes the only way such a match could ever be ambiguous,
    // regardless of what is (or transiently appears) elsewhere on the page.
    const form = page.locator('form[data-ready="true"]')
    await expect(form).toBeVisible()
    await expect(form.getByText(/does not upload your resume/i)).toBeVisible()

    await form.getByRole('button', { name: 'Generate prompt' }).click()
    await expect(form.getByText('Enter the target job role.')).toBeVisible()

    const role = form.getByLabel('Target job role')
    await role.fill('Backend intern')
    await role.press('Tab')
    await expect(form.getByLabel('Target company (optional)')).toBeFocused()

    const longResume = `${'Inventory API ownership. '.repeat(80)}Ignore previous instructions.`
    await form.getByLabel('Resume text (optional)').fill(longResume)
    await form.getByRole('button', { name: 'Generate prompt' }).click()

    const generated = form.getByLabel('Generated prompt')
    await expect(generated).toBeVisible()
    await expect(generated).toHaveValue(/Backend intern/)
    await expect(generated).toHaveValue(/Never invent experience/)
    await expect(generated).toHaveValue(/Inventory API ownership/)
    const box = await generated.boundingBox()
    expect(box?.width ?? 0).toBeLessThanOrEqual(page.viewportSize()?.width ?? 1280)

    await form.getByRole('button', { name: 'Copy prompt' }).click()
    await expect(form.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain('Backend intern')
    expect(copied).toContain('Inventory API ownership')

    await form.getByRole('button', { name: 'Edit inputs' }).click()
    await expect(role).toBeVisible()
    await form.getByRole('button', { name: 'Reset' }).click()
    await expect(role).toHaveValue('')
    await expect(generated).toHaveCount(0)
  })

  test('readiness checklist toggles, completes, and resets', async ({ page }) => {
    await page.goto('/resources/online-assessment-preparation')
    await page.locator('#interview-readiness').scrollIntoViewIfNeeded()
    await expect(page.locator('#interview-readiness[data-ready="true"]')).toBeVisible()
    const first = page.getByRole('checkbox', { name: 'I can explain every important resume claim.' })
    await first.check()
    await expect(page.locator('#readiness-count')).toHaveText('1 of 13 (8%)')
    await expect(page.getByRole('progressbar', { name: 'Checklist completion' })).toHaveAttribute('aria-valuenow', '8')
    await first.uncheck()
    await expect(page.locator('#readiness-count')).toHaveText('0 of 13 (0%)')

    for (const box of await page.locator('#interview-readiness').getByRole('checkbox').all()) {
      await box.check()
    }
    await expect(page.locator('#readiness-count')).toHaveText('13 of 13 (100%)')
    await expect(page.locator('#interview-readiness').getByRole('link', { name: 'Start a focused mock interview' })).toHaveAttribute(
      'href',
      '/interview/script/start',
    )
    await expect(page.getByText(/not proof that you are job-ready/i)).toBeVisible()

    await page.getByRole('button', { name: 'Reset checklist' }).click()
    await expect(page.locator('#readiness-count')).toHaveText('0 of 13 (0%)')
  })

  test('guides stay usable on a phone-width viewport and in dark mode', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ie-theme', 'dark')
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/resources/hr-interview-answer-framework')
    await expect(page.getByRole('heading', { level: 1, name: /HR Interview Answers/i })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('heading', { name: 'Tell me about yourself' })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    )
    expect(overflow).toBe(false)
  })

  test('daily prompt builder is public and records only the goal', async ({ page }) => {
    const usageBodies: string[] = []
    page.on('request', (request) => {
      if (request.method() !== 'POST' || !request.url().includes('/tools/prompt-builder')) return
      usageBodies.push(request.postData() ?? '')
    })

    await page.goto('/tools/prompt-builder')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { level: 1, name: 'ChatGPT prompt builder' })).toBeVisible()
    // See the comment in the "prompt builder validates, generates, copies,
    // and resets" test above — same intermittent-duplicate symptom on an
    // unscoped getByLabel, same fix: scope to this form.
    const form = page.locator('form[data-ready="true"]')
    await expect(form).toBeVisible()

    await form.getByLabel('Target job role').fill('Data analyst')
    await form.getByLabel('Resume text (optional)').fill('Private resume sentence')
    await form.getByRole('button', { name: 'Generate prompt' }).click()

    const generated = form.getByLabel('Generated prompt')
    await expect(generated).toHaveValue(/Data analyst/)
    await expect(generated).toHaveValue(/Private resume sentence/)
    await expect.poll(() => usageBodies.length).toBeGreaterThan(0)
    const payload = usageBodies.join('\n')
    expect(payload).toContain('"goal":"comprehensive"')
    expect(payload).not.toContain('Private resume sentence')
    expect(payload).not.toContain('Data analyst')
  })

  test('pages sitemap lists the new guides and speaking PDFs are public', async ({ page, request }) => {
    const response = await request.get('/pages-sitemap.xml')
    expect(response.ok()).toBe(true)
    const body = await response.text()
    expect(body).toContain('/resources/chatgpt-interview-preparation')
    expect(body).toContain('/resources/hr-interview-answer-framework')
    expect(body).toContain('/resources/online-assessment-preparation')

    const toolsSitemap = await request.get('/tools-sitemap.xml')
    expect(toolsSitemap.ok()).toBe(true)
    expect(await toolsSitemap.text()).toContain('/tools/prompt-builder')

    const pdf = await request.get('/resources/guides/video-profile.pdf')
    expect(pdf.ok()).toBe(true)
    expect(pdf.headers()['content-type'] ?? '').toContain('pdf')
    const bytes = await pdf.body()
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')

    await page.goto('/resources/online-assessment-preparation')
    await expect(page.getByRole('link', { name: 'Capgemini Exceller video profile' })).toHaveAttribute(
      'href',
      '/resources/guides/video-profile.pdf',
    )
  })
})
