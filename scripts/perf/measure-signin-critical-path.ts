/**
 * Lab timings for password sign-in post-auth lookups (not credential entry).
 *
 * Measures profile + hiring-org reads separately and in parallel against staging.
 *
 *   npx tsx scripts/perf/with-staging-env.ts npx tsx scripts/perf/measure-signin-critical-path.ts
 *
 * Requires PERF_SIGNIN_USER_ID (UUID) — never logs email/password.
 */

import { performance } from 'node:perf_hooks'
import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`Missing ${name}`)
  return v
}

async function main(): Promise<void> {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const userId = process.env.PERF_SIGNIN_USER_ID?.trim()
  if (!userId) {
    console.log(JSON.stringify({
      surface: 'signin-critical-path-lab',
      status: 'SKIPPED',
      reason: 'PERF_SIGNIN_USER_ID not set',
    }))
    return
  }
  if (url.includes('plfuvgkycmxcyshrgpgv')) {
    throw new Error('Refusing to run against production project ref')
  }

  const svc = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const runs = Math.max(1, Number(process.env.PERF_SIGNIN_RUNS ?? 5))
  const serial: number[] = []
  const parallel: number[] = []

  for (let i = 0; i < runs; i++) {
    const t0 = performance.now()
    await svc.from('users').select('plan_tier').eq('id', userId).single()
    await svc.from('hiring_organizations').select('id').eq('admin_user_id', userId).maybeSingle()
    serial.push(performance.now() - t0)

    const t1 = performance.now()
    await Promise.all([
      svc.from('users').select('plan_tier').eq('id', userId).single(),
      svc.from('hiring_organizations').select('id').eq('admin_user_id', userId).maybeSingle(),
    ])
    parallel.push(performance.now() - t1)
  }

  const stats = (samples: number[]) => {
    const sorted = [...samples].sort((a, b) => a - b)
    const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]!
    return { n: sorted.length, median: pick(0.5), p75: pick(0.75), min: sorted[0], max: sorted.at(-1) }
  }

  console.log(JSON.stringify({
    surface: 'signin-critical-path-lab',
    serial_plan_then_hiring_ms: stats(serial),
    parallel_plan_and_hiring_ms: stats(parallel),
  }))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
