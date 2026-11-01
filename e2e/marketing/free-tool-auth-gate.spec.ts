import { expect, test, type Page } from '@playwright/test'

/**
 * Interactive free tools require a registered account, but their public pages
 * (H1, explanatory copy, metadata) must stay crawlable for anonymous visitors.
 * The E2E env uses placeholder Supabase credentials, so every visitor is anonymous.
 */

async function dismissConsent(page: Page) {
  const reject = page.getByRole('button', { name: 'Reject analytics' })
  if (await reject.isVisible().catch(() => false)) {
    await reject.click()
  }
}

type ToolCase = {
  path: string
  h1: RegExp
  submit: (page: Page) => Promise<void>
}

const TOOLS: ToolCase[] = [
  {
    path: '/tools/ats-checker',
    h1: /parser reads your resume/i,
    submit: async (page) => {
      await page.getByRole('button', { name: /Check my resume/i }).click()
    },
  },
  {
    path: '/tools/question-generator',
    h1: /Interview Question Generator/i,
    submit: async (page) => {
      await page.locator('input[name="role"]').fill('Backend Engineer')
      await page.getByRole('button', { name: /Generate questions/i }).click()
    },
  },
  {
    path: '/tools/star-builder',
    h1: /STAR method answer builder/i,
    submit: async (page) => {
      await page.locator('input[name="targetRole"]').fill('Backend Engineer')
      await page.locator('textarea[name="situation"]').fill('Checkout went down during a sale.')
      await page.locator('textarea[name="task"]').fill('I had to restore checkout quickly.')
      await page.locator('textarea[name="action"]').fill('I found and reverted the bad deploy.')
      await page.locator('textarea[name="result"]').fill('Checkout recovered within eight minutes.')
      await page.getByRole('button', { name: /Build my STAR answer/i }).click()
    },
  },
  {
    path: '/tools/prompt-builder',
    h1: /ChatGPT prompt builder/i,
    submit: async (page) => {
      const form = page.locator('form[data-ready="true"]')
      await expect(form).toBeVisible()
      await form.getByLabel('Target job role').fill('Data analyst')
      await form.getByRole('button', { name: 'Generate prompt' }).click()
    },
  },
]

test.describe('free tools require a free account to run', () => {
  for (const tool of TOOLS) {
    test(`${tool.path} stays public and gates the interactive action`, async ({ page }) => {
      const toolActionPosts: string[] = []
      page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes(tool.path)) {
          toolActionPosts.push(request.url())
        }
      })

      const response = await page.goto(tool.path)
      expect(response?.status()).toBe(200)
      await expect(page).not.toHaveURL(/\/login/)
      await dismissConsent(page)
      await expect(page.getByRole('heading', { level: 1, name: tool.h1 })).toBeVisible()

      await tool.submit(page)

      const gate = page.getByTestId('free-tool-auth-gate')
      await expect(gate).toBeVisible()
      const encodedPath = encodeURIComponent(tool.path)
      await expect(gate.getByTestId('free-tool-auth-gate-signup')).toHaveAttribute(
        'href',
        `/signup?next=${encodedPath}`,
      )
      await expect(gate.getByTestId('free-tool-auth-gate-login')).toHaveAttribute(
        'href',
        `/login?next=${encodedPath}`,
      )
      // The client pre-check stops anonymous submissions before any server action runs.
      expect(toolActionPosts).toHaveLength(0)
    })
  }
})
