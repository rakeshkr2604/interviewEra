/**
 * Authenticated Lighthouse against a local production server.
 * Uses Playwright storage-state cookies. Never prints cookie values.
 *
 *   npx tsx scripts/perf/lighthouse-authenticated.ts
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { resolvePlaywrightBaseUrl } from '../../src/lib/e2e/playwright-base-url'

const ROUTES = ['/dashboard', '/history', '/analytics', '/settings'] as const
const FORM_FACTORS = ['mobile', 'desktop'] as const

const storagePath = join(process.cwd(), 'e2e', '.auth', 'user.json')
if (!existsSync(storagePath)) {
  process.stderr.write('Missing e2e/.auth/user.json — run staging Playwright globalSetup first.\n')
  process.exit(2)
}

const storage = JSON.parse(readFileSync(storagePath, 'utf8')) as {
  cookies?: Array<{ name: string; value: string }>
}
const cookieHeader = (storage.cookies ?? []).map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
if (!cookieHeader) {
  process.stderr.write('Storage state has no cookies.\n')
  process.exit(2)
}

const tmp = mkdtempSync(join(tmpdir(), 'ie-lh-'))
const extraHeadersPath = join(tmp, 'headers.json')
writeFileSync(extraHeadersPath, JSON.stringify({ Cookie: cookieHeader }), 'utf8')

const baseURL = resolvePlaywrightBaseUrl(process.env)
const results: Array<Record<string, unknown>> = []

try {
  for (const formFactor of FORM_FACTORS) {
    for (const route of ROUTES) {
      const url = `${baseURL}${route}`
      const outJson = join(tmp, `lh-${formFactor}${route.replaceAll('/', '-')}.json`)
      const args = [
        'lighthouse',
        url,
        '--only-categories=performance',
        '--quiet',
        '--chrome-flags=--headless --no-sandbox',
        '--output=json',
        `--output-path=${outJson}`,
        `--extra-headers=${extraHeadersPath}`,
        formFactor === 'desktop' ? '--preset=desktop' : '--emulated-form-factor=mobile',
        '--max-wait-for-load=45000',
      ]
      const ran = spawnSync('npx', args, { encoding: 'utf8', shell: true, timeout: 120_000 })
      if (ran.status !== 0 || !existsSync(outJson)) {
        results.push({
          formFactor,
          route,
          error: (ran.stderr || ran.stdout || 'lighthouse failed').slice(0, 800),
        })
        continue
      }
      const report = JSON.parse(readFileSync(outJson, 'utf8')) as {
        categories?: { performance?: { score?: number } }
        audits?: Record<string, { numericValue?: number; displayValue?: string }>
      }
      const requestedUrl = url
      const finalUrl = (JSON.parse(readFileSync(outJson, 'utf8')) as { finalRequestedUrl?: string; requestedUrl?: string })
        .finalRequestedUrl
      results.push({
        formFactor,
        route,
        redirectedAway: Boolean(finalUrl && !String(finalUrl).includes(route)),
        performanceScore: Math.round((report.categories?.performance?.score ?? 0) * 100),
        lcpMs: report.audits?.['largest-contentful-paint']?.numericValue ?? null,
        fcpMs: report.audits?.['first-contentful-paint']?.numericValue ?? null,
        tbtMs: report.audits?.['total-blocking-time']?.numericValue ?? null,
        cls: report.audits?.['cumulative-layout-shift']?.numericValue ?? null,
        ttfbMs: report.audits?.['server-response-time']?.numericValue ?? null,
        requestedUrl,
      })
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

process.stdout.write(`${JSON.stringify({ baseURLHost: new URL(baseURL).host, results }, null, 2)}\n`)
