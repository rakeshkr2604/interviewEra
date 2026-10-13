/**
 * Lab benchmark for admin funnel + growth metric computation against staging.
 *
 *   npx tsx scripts/perf/with-staging-env.ts npx tsx scripts/perf/measure-admin-funnel.ts
 *
 * Never points at production .env.local. Prints timing + step counts only (no PII).
 */

import { performance } from 'node:perf_hooks'
import { createClient } from '@supabase/supabase-js'
import { computeFunnelMetrics } from '../../src/lib/admin/funnel-metrics'
import { computeGrowthMetrics } from '../../src/lib/admin/growth-metrics'

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) {
    throw new Error(`Missing ${name} — run via scripts/perf/with-staging-env.ts`)
  }
  return v
}

function summarize(samples: number[]): { n: number; median: number; p75: number; min: number; max: number } {
  const sorted = [...samples].sort((a, b) => a - b)
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]!
  return {
    n: sorted.length,
    median: pick(0.5),
    p75: pick(0.75),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  }
}

async function timeMs(fn: () => Promise<unknown>): Promise<number> {
  const t0 = performance.now()
  await fn()
  return performance.now() - t0
}

async function main(): Promise<void> {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (url.includes('plfuvgkycmxcyshrgpgv')) {
    throw new Error('Refusing to run funnel lab benchmark against production project ref')
  }

  const svc = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const runs = Math.max(1, Number(process.env.PERF_FUNNEL_RUNS ?? 5))
  const ranges = [30, 90]

  for (const days of ranges) {
    const funnelSamples: number[] = []
    const growthSamples: number[] = []
    let lastFunnel: Awaited<ReturnType<typeof computeFunnelMetrics>> | null = null

    for (let i = 0; i < runs; i++) {
      funnelSamples.push(await timeMs(async () => {
        lastFunnel = await computeFunnelMetrics(svc, days)
      }))
      growthSamples.push(await timeMs(async () => {
        await computeGrowthMetrics(svc, days)
      }))
    }

    const f = summarize(funnelSamples)
    const g = summarize(growthSamples)
    console.log(JSON.stringify({
      surface: 'admin-funnel-lab',
      range_days: days,
      funnel_ms: f,
      growth_ms: g,
      cohort_signups: lastFunnel?.cohort_signups ?? null,
      step_counts: lastFunnel?.steps.map((s) => ({ key: s.key, count: s.count })) ?? null,
    }))
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
