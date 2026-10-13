/**
 * Sum gzip/raw sizes for the dashboard App Router client graph from a
 * production webpack build. Next 16 has no app-build-manifest pages map, so
 * this reads rootMainFiles + the dashboard client-reference-manifest chunks.
 *
 *   npx tsx scripts/perf/measure-dashboard-js-graph.ts
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

function gzipBytes(buf: Buffer): number {
  return gzipSync(buf, { level: 9 }).length
}

function kb(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`
}

function classify(file: string): string {
  const name = file.toLowerCase()
  if (name.includes('videosdk') || name.includes('f688cda4')) return 'videosdk'
  if (name.includes('6465-') || name.includes('recharts') || name.includes('scoretrend')) {
    return 'recharts'
  }
  if (name.includes('spokenanswer') || name.includes('questions') || name.includes('blog/layout')) {
    return 'question-bank'
  }
  if (name.includes('supabase')) return 'supabase'
  if (name.includes('motion') || name.includes('framer')) return 'motion'
  if (name.includes('(dashboard)/dashboard/page')) return 'dashboard-page'
  if (name.includes('(dashboard)/layout')) return 'dashboard-layout'
  if (name.includes('app/layout')) return 'root-layout'
  if (name.includes('main-app') || name.includes('webpack') || name.includes('4bd1b696') || name.includes('3794-')) {
    return 'runtime'
  }
  return 'shared'
}

function unique(files: string[]): string[] {
  return [...new Set(files.filter((file) => file.endsWith('.js')))]
}

const root = process.cwd()
const buildManifest = JSON.parse(
  readFileSync(join(root, '.next/build-manifest.json'), 'utf8'),
) as { rootMainFiles?: string[] }
const clientManifestPath = join(
  root,
  '.next/server/app/(dashboard)/dashboard/page_client-reference-manifest.js',
)
if (!existsSync(clientManifestPath)) {
  process.stderr.write('Missing dashboard client-reference-manifest. Run a webpack production build first.\n')
  process.exit(1)
}

const clientSource = readFileSync(clientManifestPath, 'utf8')
const fromManifest = [...clientSource.matchAll(/static\/chunks\/[^"']+\.js/g)].map((match) => match[0])
const dashboardOnly = fromManifest.filter(
  (file) =>
    file.includes('(dashboard)/dashboard/page') ||
    file.includes('(dashboard)/layout') ||
    file.includes('app/layout-') ||
    /6465-/.test(file),
)
const files = unique([
  ...(buildManifest.rootMainFiles ?? []),
  ...fromManifest.filter((file) => !file.includes('app/page-') && !file.includes('(marketing)')),
])

const rows = files.map((rel) => {
  const abs = join(root, '.next', rel)
  const raw = existsSync(abs) ? statSync(abs).size : 0
  const gz = existsSync(abs) ? gzipBytes(readFileSync(abs)) : 0
  return { file: rel, raw, gzip: gz, class: classify(rel), missing: !existsSync(abs) }
})

const initialLike = unique([
  ...(buildManifest.rootMainFiles ?? []),
  ...fromManifest.filter(
    (file) =>
      file.includes('app/layout-') ||
      file.includes('(dashboard)/layout') ||
      file.includes('(dashboard)/dashboard/page') ||
      file.includes('8500-') ||
      file.includes('8409-'),
  ),
])

const initialRows = rows.filter((row) => initialLike.includes(row.file))
const sum = (list: typeof rows) =>
  list.reduce(
    (acc, row) => {
      acc.raw += row.raw
      acc.gzip += row.gzip
      return acc
    },
    { raw: 0, gzip: 0 },
  )

const totals = sum(rows)
const initialTotals = sum(initialRows)
const recharts = rows.filter((row) => row.class === 'recharts')
const videosdk = rows.filter((row) => row.class === 'videosdk')
const questionBank = rows.filter((row) => row.class === 'question-bank')

const payload = {
  measuredAt: new Date().toISOString(),
  clientManifestChunks: unique(fromManifest).length,
  dashboardHintFiles: unique(dashboardOnly),
  fullClientGraph: {
    files: rows.length,
    raw: kb(totals.raw),
    gzip: kb(totals.gzip),
    rawBytes: totals.raw,
    gzipBytes: totals.gzip,
  },
  namedInitial: {
    files: initialRows.length,
    raw: kb(initialTotals.raw),
    gzip: kb(initialTotals.gzip),
    rawBytes: initialTotals.raw,
    gzipBytes: initialTotals.gzip,
  },
  recharts: recharts.map((row) => ({ file: row.file, gzip: kb(row.gzip) })),
  videosdk: videosdk.map((row) => ({ file: row.file, gzip: kb(row.gzip) })),
  questionBank: questionBank.map((row) => ({ file: row.file, gzip: kb(row.gzip) })),
  classes: Object.fromEntries(
    [...new Set(rows.map((row) => row.class))].map((cls) => {
      const group = rows.filter((row) => row.class === cls)
      const grouped = sum(group)
      return [cls, { files: group.length, raw: kb(grouped.raw), gzip: kb(grouped.gzip) }]
    }),
  ),
  note: 'Gzip is on-disk zlib level 9, not CDN brotli. fullClientGraph includes every JS path referenced by the dashboard client-reference-manifest except marketing homepage chunks. Browser Network traces remain the transfer SoT.',
}

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
