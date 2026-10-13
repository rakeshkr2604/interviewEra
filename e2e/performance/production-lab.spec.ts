import { expect } from '@playwright/test'
import { authReady, authenticatedTest as test } from '../helpers/auth-fixture'

/**
 * Lab timings against `next start` (production webpack), not `next dev`.
 * Not field Core Web Vitals and not a Lighthouse score.
 */

const ROUTES = ['/dashboard', '/history', '/analytics', '/settings'] as const
const RUNS = 3

type LabSample = {
  path: string
  ttfbMs: number | null
  fcpMs: number | null
  lcpMs: number | null
  cls: number | null
  transferJsBytes: number
  encodedJsBytes: number
  decodedJsBytes: number
  requestCount: number
  longTaskCount: number
  lcpTag: string | null
  shiftSources: string[]
  jsFiles: Array<{ name: string; transfer: number; encoded: number; start: number }>
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function p75(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75) - 1)
  return sorted[Math.max(0, idx)]
}

const prodLab = process.env.E2E_WEB_SERVER === 'start' || process.env.PERF_PROD_LAB === '1'

test.describe('authenticated production-build lab timings', () => {
  test.skip(!authReady, 'Requires authenticated Playwright storage state')
  test.skip(!prodLab, 'Set E2E_WEB_SERVER=start after a staging production build')

  test('records median TTFB/FCP/LCP/CLS and JS transfer for core routes', async ({
    page,
  }) => {
    const byRoute: Record<string, LabSample[]> = {}

    for (const path of ROUTES) {
      byRoute[path] = []
      for (let run = 0; run < RUNS; run += 1) {
        await page.goto(path, { waitUntil: 'networkidle' })
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
          timeout: 20_000,
        })
        await page.waitForTimeout(1200)

        const sample = await page.evaluate(async (routePath) => {
          const nav = performance.getEntriesByType(
            'navigation',
          )[0] as PerformanceNavigationTiming | undefined
          const paints = performance.getEntriesByType('paint')
          const fcp = paints.find((entry) => entry.name === 'first-contentful-paint')

          let cls = 0
          const shiftSources: string[] = []
          try {
            const shifts = performance.getEntriesByType('layout-shift') as Array<
              PerformanceEntry & {
                value?: number
                hadRecentInput?: boolean
                sources?: Array<{ node?: Element | null }>
              }
            >
            for (const shift of shifts) {
              if (shift.hadRecentInput) continue
              cls += shift.value ?? 0
              for (const source of shift.sources ?? []) {
                const node = source.node
                if (!node) continue
                const className =
                  typeof node.className === 'string' ? node.className.split(/\s+/).slice(0, 6).join('.') : ''
                shiftSources.push(`${node.tagName.toLowerCase()}${className ? `.${className}` : ''}`)
              }
            }
          } catch {
            cls = 0
          }

          const lcp = await new Promise<{ t: number | null; tag: string | null }>((resolve) => {
            let latest = { t: null as number | null, tag: null as string | null }
            try {
              const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries() as Array<
                  PerformanceEntry & { element?: Element | null }
                >
                if (entries.length > 0) {
                  const last = entries[entries.length - 1]
                  latest = {
                    t: Math.round(last.startTime),
                    tag: last.element?.tagName ?? null,
                  }
                }
              })
              observer.observe({ type: 'largest-contentful-paint', buffered: true })
              setTimeout(() => {
                observer.disconnect()
                resolve(latest)
              }, 50)
            } catch {
              resolve({ t: null, tag: null })
            }
          })

          const resources = performance.getEntriesByType(
            'resource',
          ) as PerformanceResourceTiming[]
          const js = resources.filter(
            (entry) =>
              /\.js(\?|$)/.test(entry.name) || entry.initiatorType === 'script',
          )
          const longTasks = performance.getEntriesByType('longtask')
          const jsFiles = js.map((entry) => ({
            name: entry.name.replace(/^https?:\/\/[^/]+/, ''),
            transfer: entry.transferSize || 0,
            encoded: entry.encodedBodySize || 0,
            start: Math.round(entry.startTime),
          }))

          return {
            path: routePath,
            ttfbMs: nav ? Math.round(nav.responseStart) : null,
            fcpMs: fcp ? Math.round(fcp.startTime) : null,
            lcpMs: lcp.t,
            cls: Number(cls.toFixed(4)),
            transferJsBytes: js.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
            encodedJsBytes: js.reduce((sum, entry) => sum + (entry.encodedBodySize || 0), 0),
            decodedJsBytes: js.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0),
            requestCount: resources.length + (nav ? 1 : 0),
            longTaskCount: longTasks.length,
            lcpTag: lcp.tag,
            shiftSources,
            jsFiles,
          }
        }, path)

        byRoute[path].push(sample)
      }
    }

    const summary = ROUTES.map((path) => {
      const runs = byRoute[path]
      const num = (pick: (s: LabSample) => number | null) =>
        runs.map(pick).filter((value): value is number => value != null)
      const first = runs[0]
      const jsNames = first.jsFiles.map((file) => file.name)
      return {
        path,
        samples: runs.length,
        ttfbMedian: median(num((s) => s.ttfbMs)),
        ttfbP75: p75(num((s) => s.ttfbMs)),
        fcpMedian: median(num((s) => s.fcpMs)),
        lcpMedian: median(num((s) => s.lcpMs)),
        lcpP75: p75(num((s) => s.lcpMs)),
        clsMedian: median(num((s) => s.cls)),
        transferJsMedian: median(num((s) => s.transferJsBytes)),
        encodedJsMedian: median(num((s) => s.encodedJsBytes)),
        decodedJsMedian: median(num((s) => s.decodedJsBytes)),
        requestCountMedian: median(num((s) => s.requestCount)),
        longTaskMedian: median(num((s) => s.longTaskCount)),
        lcpTag: first.lcpTag,
        shiftSources: first.shiftSources,
        hasQuestionBank: jsNames.some((name) => /spokenanswer|questions/i.test(name)),
        hasVideoSdk: jsNames.some((name) => /videosdk/i.test(name)),
        hasRecharts: jsNames.some((name) => /recharts|6465/i.test(name)),
        rechartsStartMs: first.jsFiles.find((file) => /recharts|6465/i.test(file.name))?.start ?? null,
        jsFileCount: first.jsFiles.length,
      }
    })

    console.log('[perf:production-lab]', JSON.stringify(summary, null, 2))
    const dashboardFiles = byRoute['/dashboard'][0]?.jsFiles ?? []
    console.log(
      '[perf:dashboard-js-graph]',
      JSON.stringify(
        {
          files: dashboardFiles,
          encodedTotal: dashboardFiles.reduce((sum, file) => sum + file.encoded, 0),
          transferTotal: dashboardFiles.reduce((sum, file) => sum + file.transfer, 0),
        },
        null,
        2,
      ),
    )

    for (const row of summary) {
      expect(row.samples).toBe(RUNS)
      if (row.ttfbMedian != null) expect(row.ttfbMedian).toBeGreaterThan(0)
      expect(row.hasQuestionBank).toBe(false)
      expect(row.hasVideoSdk).toBe(false)
    }
  })
})
