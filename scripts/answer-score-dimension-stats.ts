/**
 * One-off: pull recent answer_evaluations and print per-dimension means/distributions.
 *
 * Usage (requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
 *   npx tsx scripts/answer-score-dimension-stats.ts
 *   npx tsx scripts/answer-score-dimension-stats.ts --limit 50
 *
 * Do NOT change scoring prompts based on this alone — product decision.
 */

import { createClient } from '@supabase/supabase-js'

const DIMENSION_KEYS = [
  'relevance',
  'content_accuracy',
  'communication_clarity',
  'structure',
  'specificity',
] as const

type DimKey = (typeof DIMENSION_KEYS)[number]

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo)
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length)
  return {
    n: values.length,
    mean: Number(mean.toFixed(2)),
    p25: Number(percentile(sorted, 0.25).toFixed(2)),
    p50: Number(percentile(sorted, 0.5).toFixed(2)),
    p75: Number(percentile(sorted, 0.75).toFixed(2)),
    min: sorted[0] ?? NaN,
    max: sorted[sorted.length - 1] ?? NaN,
  }
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 50

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — cannot query answer_evaluations.',
    )
    process.exit(2)
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: rows, error } = await supabase
    .from('answer_evaluations')
    .select('id, interview_id, dimensions, overall, question_type, prompt_version, created_at, status')
    .eq('status', 'scored')
    .not('dimensions', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log('No scored answer_evaluations found.')
    process.exit(0)
  }

  const interviewIds = [...new Set(rows.map((r) => r.interview_id as string))]
  const { data: interviews } = await supabase
    .from('interviews')
    .select('id, script_type, difficulty, engine')
    .in('id', interviewIds)

  const interviewById = new Map(
    (interviews ?? []).map((i) => [i.id as string, i as { script_type?: string; difficulty?: string }]),
  )

  const byDim: Record<DimKey, number[]> = {
    relevance: [],
    content_accuracy: [],
    communication_clarity: [],
    structure: [],
    specificity: [],
  }
  const byScript: Record<string, Record<DimKey, number[]>> = {}

  for (const row of rows) {
    const dims = row.dimensions as Record<string, { score?: number }> | null
    if (!dims) continue
    const script = interviewById.get(row.interview_id as string)?.script_type ?? 'unknown'
    if (!byScript[script]) {
      byScript[script] = {
        relevance: [],
        content_accuracy: [],
        communication_clarity: [],
        structure: [],
        specificity: [],
      }
    }
    for (const k of DIMENSION_KEYS) {
      const score = dims[k]?.score
      if (typeof score === 'number' && Number.isFinite(score)) {
        byDim[k].push(score)
        byScript[script][k].push(score)
      }
    }
  }

  console.log(`\nSample: ${rows.length} scored evaluations (most recent), across ${interviewIds.length} interviews`)
  console.log(`prompt_versions: ${[...new Set(rows.map((r) => r.prompt_version))].join(', ') || '(none)'}`)
  console.log('\n=== Overall dimension means ===')
  for (const k of DIMENSION_KEYS) {
    const s = summarize(byDim[k])
    console.log(
      `${k.padEnd(24)} n=${s.n}  mean=${s.mean}  p25=${s.p25}  p50=${s.p50}  p75=${s.p75}  min=${s.min}  max=${s.max}`,
    )
  }

  const means = DIMENSION_KEYS.map((k) => ({ k, mean: summarize(byDim[k]).mean }))
  const specificity = means.find((m) => m.k === 'specificity')!.mean
  const others = means.filter((m) => m.k !== 'specificity')
  const otherAvg = others.reduce((a, b) => a + b.mean, 0) / others.length
  const delta = Number((specificity - otherAvg).toFixed(2))
  console.log(
    `\nSpecificity mean (${specificity}) vs mean of other four (${otherAvg.toFixed(2)}): delta=${delta}`,
  )
  console.log(
    delta < -0.5
      ? '→ Specificity is systematically lower in this sample.'
      : delta > 0.5
        ? '→ Specificity is systematically higher in this sample.'
        : '→ Specificity is not clearly skewed vs the other four in this sample.',
  )

  console.log('\n=== By script_type ===')
  for (const [script, dims] of Object.entries(byScript)) {
    console.log(`\n${script}:`)
    for (const k of DIMENSION_KEYS) {
      const s = summarize(dims[k])
      if (s.n === 0) continue
      console.log(`  ${k.padEnd(22)} n=${s.n}  mean=${s.mean}  p50=${s.p50}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
