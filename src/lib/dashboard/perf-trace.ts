/**
 * Gated dashboard TTFB instrumentation. Default off.
 *
 * Enable with PERF_DASHBOARD_TRACE=1 on a staging `next start` process.
 * Logs `[perf:dashboard] {span,durMs,...}` — never user ids, emails, tokens,
 * cookies, interview content, or resume text.
 */

const ALLOWED_EXTRA_KEYS = new Set([
  'cached',
  'hit',
  'queryCount',
  'wave',
  'skipped',
  'source',
  'status',
])

const BLOCKED_KEY =
  /userId|user_id|email|token|cookie|interview|resume|answer|secret|authorization|session/i

export function isDashboardPerfTraceEnabled(): boolean {
  return process.env.PERF_DASHBOARD_TRACE === '1'
}

export function dashboardPerfNow(): number {
  return performance.now()
}

export function sanitizePerfExtra(
  extra?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!extra) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(extra)) {
    if (BLOCKED_KEY.test(key)) continue
    if (!ALLOWED_EXTRA_KEYS.has(key)) continue
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function dashboardPerfMark(
  span: string,
  startedAt: number,
  extra?: Record<string, unknown>,
): number {
  const durMs = Math.round((performance.now() - startedAt) * 10) / 10
  if (!isDashboardPerfTraceEnabled()) return durMs
  const payload: Record<string, unknown> = {
    span,
    durMs,
    ...sanitizePerfExtra(extra),
  }
  console.info(`[perf:dashboard] ${JSON.stringify(payload)}`)
  return durMs
}

export async function timedDashboardSpan<T>(
  span: string,
  work: () => T,
  extra?: Record<string, unknown>,
): Promise<Awaited<T>> {
  if (!isDashboardPerfTraceEnabled()) {
    return await work()
  }
  const startedAt = dashboardPerfNow()
  try {
    return await work()
  } finally {
    dashboardPerfMark(span, startedAt, extra)
  }
}
