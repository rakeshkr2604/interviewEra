/**
 * Authenticated `/dashboard` document timing against a local production server.
 * Uses Playwright storage-state cookies. Never prints cookie values or user ids.
 *
 *   npx tsx scripts/perf/measure-dashboard-server.ts
 *
 * Defaults to http://127.0.0.1:3000 so staging env URLs cannot redirect this
 * measurement to a remote host. `headersMs` approximates TTFB (fetch resolves
 * on response headers). Server span breakdown requires PERF_DASHBOARD_TRACE=1
 * on `next start`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const RUNS = 5
const storagePath = join(process.cwd(), 'e2e', '.auth', 'user.json')

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

async function main() {
  if (!existsSync(storagePath)) {
    process.stderr.write(
      'Missing e2e/.auth/user.json — run staging Playwright globalSetup first.\n',
    )
    process.exit(2)
  }

  const storage = JSON.parse(readFileSync(storagePath, 'utf8')) as {
    cookies?: Array<{ name: string; value: string }>
  }
  const cookieHeader = (storage.cookies ?? [])
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
  if (!cookieHeader) {
    process.stderr.write('Storage state has no cookies.\n')
    process.exit(2)
  }

  const port = process.env.PLAYWRIGHT_PORT?.trim() || '3000'
  const baseURL =
    process.env.PERF_MEASURE_BASE_URL?.trim() || `http://127.0.0.1:${port}`
  const url = `${baseURL}/dashboard`

  type Sample = {
    status: number
    headersMs: number
    bodyMs: number
    totalMs: number
    redirected: boolean
    bytes: number
  }

  const samples: Sample[] = []

  async function once(): Promise<Sample> {
    const t0 = performance.now()
    const res = await fetch(url, {
      headers: { cookie: cookieHeader, accept: 'text/html' },
      redirect: 'manual',
    })
    const headersMs = Math.round((performance.now() - t0) * 10) / 10
    const tBody = performance.now()
    const buf = Buffer.from(await res.arrayBuffer())
    const bodyMs = Math.round((performance.now() - tBody) * 10) / 10
    return {
      status: res.status,
      headersMs,
      bodyMs,
      totalMs: Math.round((performance.now() - t0) * 10) / 10,
      redirected: res.status >= 300 && res.status < 400,
      bytes: buf.byteLength,
    }
  }

  await once()
  for (let i = 0; i < RUNS; i += 1) {
    samples.push(await once())
  }

  const payload = {
    measuredAt: new Date().toISOString(),
    host: new URL(baseURL).host,
    route: '/dashboard',
    runs: RUNS,
    warmed: true,
    samples: samples.map((sample) => ({
      status: sample.status,
      headersMs: sample.headersMs,
      bodyMs: sample.bodyMs,
      totalMs: sample.totalMs,
      redirected: sample.redirected,
      bytes: sample.bytes,
    })),
    medianHeadersMs: median(samples.map((s) => s.headersMs)),
    medianBodyMs: median(samples.map((s) => s.bodyMs)),
    medianTotalMs: median(samples.map((s) => s.totalMs)),
    note: 'headersMs is fetch-header wait (TTFB proxy). Not production field TTFB.',
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
}

void main()
