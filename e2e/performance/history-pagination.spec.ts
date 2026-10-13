import { expect } from '@playwright/test'
import { authReady, authenticatedTest as test } from '../helpers/auth-fixture'

test.describe('History pagination @staging', () => {
  test.skip(!authReady, 'Requires authenticated staging storage state')

  test('default page stays at most 20 items and lifetime tab counts are visible', async ({
    page,
  }) => {
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: /interview history/i })).toBeVisible({
      timeout: 20_000,
    })

    const items = page.getByTestId('history-item')
    const count = await items.count()
    expect(count).toBeLessThanOrEqual(20)

    const allTab = page.getByTestId('history-tab-all')
    await expect(allTab).toBeVisible()
    const allLabel = (await allTab.innerText()).trim()
    expect(allLabel).toMatch(/All \(\d+\)/)
    const lifetime = Number.parseInt(allLabel.replace(/[^\d]/g, ''), 10)
    expect(lifetime).toBeGreaterThanOrEqual(count)
    if (count === 0) {
      await expect(page.getByTestId('history-empty')).toBeVisible()
    }
  })

  test('pageSize=1 paginates without duplicating records and keeps tab counts', async ({
    page,
  }) => {
    await page.goto('/history?pageSize=1')
    await expect(page.getByRole('heading', { name: /interview history/i })).toBeVisible({
      timeout: 20_000,
    })

    const allTab = page.getByTestId('history-tab-all')
    const lifetime = Number.parseInt(
      (await allTab.innerText()).replace(/[^\d]/g, ''),
      10,
    )
    const items = page.getByTestId('history-item')
    const firstCount = await items.count()
    expect(firstCount).toBeLessThanOrEqual(1)

    if (lifetime === 0) {
      await expect(page.getByTestId('history-empty')).toBeVisible()
      return
    }

    expect(firstCount).toBe(1)
    const firstId = await items.first().getAttribute('data-interview-id')
    expect(firstId).toBeTruthy()

    const completedTab = page.getByTestId('history-tab-completed')
    const completedLabel = await completedTab.innerText()
    await expect(completedTab).toHaveText(/Completed \(\d+\)/)

    if (lifetime < 2) {
      await expect(page.getByRole('navigation', { name: 'History pagination' })).toHaveCount(0)
      return
    }

    const next = page.getByRole('navigation', { name: 'History pagination' }).getByRole('link', {
      name: 'Next',
    })
    await next.click()
    await expect(page).toHaveURL(/page=2/)
    const secondId = await page.getByTestId('history-item').first().getAttribute('data-interview-id')
    expect(secondId).toBeTruthy()
    expect(secondId).not.toBe(firstId)

    await page.goBack()
    await expect(page).toHaveURL(/pageSize=1/)
    await expect(page).not.toHaveURL(/page=2/)
    const backId = await page.getByTestId('history-item').first().getAttribute('data-interview-id')
    expect(backId).toBe(firstId)

    await page.goForward()
    await expect(page).toHaveURL(/page=2/)
    const forwardId = await page
      .getByTestId('history-item')
      .first()
      .getAttribute('data-interview-id')
    expect(forwardId).toBe(secondId)

    await completedTab.click()
    await expect(page).toHaveURL(/tab=completed/)
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page.getByTestId('history-tab-completed')).toHaveText(completedLabel)
  })

  test('overshot page clamps instead of showing a false empty state', async ({ page }) => {
    await page.goto('/history?page=99')
    await expect(page.getByRole('heading', { name: /interview history/i })).toBeVisible({
      timeout: 20_000,
    })
    const lifetime = Number.parseInt(
      (await page.getByTestId('history-tab-all').innerText()).replace(/[^\d]/g, ''),
      10,
    )
    if (lifetime === 0) {
      await expect(page.getByTestId('history-empty')).toBeVisible()
      return
    }
    await expect(page.getByTestId('history-empty')).toHaveCount(0)
    expect(await page.getByTestId('history-item').count()).toBeGreaterThan(0)
    await expect(page).not.toHaveURL(/page=99/)
  })

  test('mobile history tabs remain tappable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: /interview history/i })).toBeVisible({
      timeout: 20_000,
    })
    const tab = page.getByTestId('history-tab-completed')
    await expect(tab).toBeVisible()
    const box = await tab.boundingBox()
    expect(box).toBeTruthy()
    expect((box?.height ?? 0) * (box?.width ?? 0)).toBeGreaterThan(0)
    await tab.click()
    await expect(page).toHaveURL(/tab=completed/)
  })
})
