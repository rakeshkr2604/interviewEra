import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dashboardPerfMark,
  dashboardPerfNow,
  isDashboardPerfTraceEnabled,
  sanitizePerfExtra,
  timedDashboardSpan,
} from './perf-trace'

describe('dashboard perf trace', () => {
  const original = process.env.PERF_DASHBOARD_TRACE

  afterEach(() => {
    if (original === undefined) delete process.env.PERF_DASHBOARD_TRACE
    else process.env.PERF_DASHBOARD_TRACE = original
    vi.restoreAllMocks()
  })

  it('is off unless PERF_DASHBOARD_TRACE=1', () => {
    delete process.env.PERF_DASHBOARD_TRACE
    expect(isDashboardPerfTraceEnabled()).toBe(false)
    process.env.PERF_DASHBOARD_TRACE = 'true'
    expect(isDashboardPerfTraceEnabled()).toBe(false)
    process.env.PERF_DASHBOARD_TRACE = '1'
    expect(isDashboardPerfTraceEnabled()).toBe(true)
  })

  it('is not enabled by checked-in production config', () => {
    const root = process.cwd()
    const vercel = readFileSync(join(root, 'vercel.json'), 'utf8')
    const envExample = readFileSync(join(root, '.env.example'), 'utf8')
    const nextConfig = readFileSync(join(root, 'next.config.ts'), 'utf8')
    expect(vercel).not.toMatch(/PERF_DASHBOARD_TRACE/)
    expect(envExample).not.toMatch(/PERF_DASHBOARD_TRACE\s*=\s*1/)
    expect(nextConfig).toContain('enabled: process.env.ANALYZE === "true"')
    expect(nextConfig).toContain('openAnalyzer: process.env.ANALYZE_OPEN === "true"')
  })

  it('drops user identifiers and other sensitive extra keys', () => {
    expect(
      sanitizePerfExtra({
        cached: true,
        queryCount: 7,
        userId: 'should-not-appear',
        email: 'hidden@example.com',
        token: 'secret',
        interviewId: 'iv',
      }),
    ).toEqual({ cached: true, queryCount: 7 })
  })

  it('does not log when disabled', () => {
    delete process.env.PERF_DASHBOARD_TRACE
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    dashboardPerfMark('auth.getUser', dashboardPerfNow() - 12)
    expect(info).not.toHaveBeenCalled()
  })

  it('logs span duration without user keys when enabled', async () => {
    process.env.PERF_DASHBOARD_TRACE = '1'
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await timedDashboardSpan('wave1', async () => 'ok', {
      queryCount: 7,
      userId: 'nope',
    })
    expect(info).toHaveBeenCalledTimes(1)
    const line = String(info.mock.calls[0]?.[0])
    expect(line).toMatch(/^\[perf:dashboard\] /)
    const payload = JSON.parse(line.slice('[perf:dashboard] '.length)) as Record<
      string,
      unknown
    >
    expect(payload.span).toBe('wave1')
    expect(typeof payload.durMs).toBe('number')
    expect(payload.queryCount).toBe(7)
    expect(payload).not.toHaveProperty('userId')
    expect(JSON.stringify(payload)).not.toMatch(/nope/)
  })
})
