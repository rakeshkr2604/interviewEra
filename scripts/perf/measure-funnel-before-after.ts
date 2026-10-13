/**
 * Compare return-visit query shape cost: legacy per-user loop vs set-based.
 * Uses staging service role. No PII logged.
 *
 *   npx tsx scripts/perf/with-staging-env.ts npx tsx scripts/perf/measure-funnel-before-after.ts
 */

import { performance } from 'node:perf_hooks'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { chunkIds } from '../../src/lib/dashboard/id-chunks'

function requireEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`Missing ${name}`)
  return v
}

async function fetchCohort(svc: SupabaseClient, sinceIso: string) {
  const { data } = await svc.from('users').select('id, created_at').gte('created_at', sinceIso)
  return (data ?? []) as { id: string; created_at: string }[]
}

async function returnVisitLegacy(svc: SupabaseClient, cohort: { id: string; created_at: string }[]) {
  let returned = 0
  let queries = 0
  for (const row of cohort) {
    queries += 1
    const { data: activity } = await svc
      .from('user_activity')
      .select('last_seen_at')
      .eq('user_id', row.id)
      .maybeSingle()
    if (!activity?.last_seen_at) continue
    const lastSeen = new Date(activity.last_seen_at as string).getTime()
    const d7 = new Date(row.created_at).getTime() + 7 * 24 * 60 * 60 * 1000
    if (lastSeen >= d7) returned += 1
  }
  return { returned, queries }
}

async function returnVisitSetBased(svc: SupabaseClient, cohort: { id: string; created_at: string }[]) {
  let queries = 0
  const lastSeenByUser = new Map<string, number>()
  for (const chunk of chunkIds(cohort.map((r) => r.id))) {
    queries += 1
    const { data: activity } = await svc
      .from('user_activity')
      .select('user_id, last_seen_at')
      .in('user_id', chunk)
    for (const row of activity ?? []) {
      if (!row.last_seen_at) continue
      lastSeenByUser.set(row.user_id as string, new Date(row.last_seen_at as string).getTime())
    }
  }
  let returned = 0
  for (const row of cohort) {
    const lastSeen = lastSeenByUser.get(row.id)
    if (lastSeen == null) continue
    const d7 = new Date(row.created_at).getTime() + 7 * 24 * 60 * 60 * 1000
    if (lastSeen >= d7) returned += 1
  }
  return { returned, queries }
}

function stats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b)
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]!
  return { n: sorted.length, median: pick(0.5), p75: pick(0.75), min: sorted[0], max: sorted.at(-1) }
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (url.includes('plfuvgkycmxcyshrgpgv')) {
    throw new Error('Refusing production')
  }
  const svc = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const days = Number(process.env.PERF_RANGE_DAYS ?? 90)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const cohort = await fetchCohort(svc, since)
  const runs = Math.max(1, Number(process.env.PERF_FUNNEL_RUNS ?? 5))

  const legacyMs: number[] = []
  const setMs: number[] = []
  let legacyMeta = { returned: 0, queries: 0 }
  let setMeta = { returned: 0, queries: 0 }

  for (let i = 0; i < runs; i++) {
    let t0 = performance.now()
    legacyMeta = await returnVisitLegacy(svc, cohort)
    legacyMs.push(performance.now() - t0)

    t0 = performance.now()
    setMeta = await returnVisitSetBased(svc, cohort)
    setMs.push(performance.now() - t0)
  }

  if (legacyMeta.returned !== setMeta.returned) {
    throw new Error(`parity fail: legacy=${legacyMeta.returned} set=${setMeta.returned}`)
  }

  console.log(JSON.stringify({
    surface: 'return-visit-before-after-lab',
    range_days: days,
    cohort_size: cohort.length,
    returned: setMeta.returned,
    legacy_queries: legacyMeta.queries,
    set_based_queries: setMeta.queries,
    legacy_ms: stats(legacyMs),
    set_based_ms: stats(setMs),
  }))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
