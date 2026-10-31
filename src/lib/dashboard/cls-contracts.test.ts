import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(rel: string): string {
  return readFileSync(join(root, ...rel.split('/')), 'utf8')
}

describe('dashboard CLS contracts', () => {
  it('reserves classic scrollbar gutter on html and dashboard chrome', () => {
    const css = read('src/app/globals.css')
    expect(css).toMatch(/scrollbar-gutter:\s*stable/)
    const chrome = read('src/components/layout/DashboardChrome.tsx')
    expect(chrome).toContain("scrollbarGutter: 'stable'")
    expect(chrome).not.toContain('isImmersiveViewport ? \'stable\'')
  })

  it('exports the community card server-visible constant', () => {
    const src = read('src/components/community/DashboardCommunityCard.tsx')
    expect(src).toContain('export const DASHBOARD_COMMUNITY_CARD_SERVER_VISIBLE = true')
  })

  it('reserves a fixed plot height for the dashboard score trend chart (no Recharts/dynamic-import CLS risk)', () => {
    // Score trend moved off Recharts (dynamic-import + ssr:false, needed a
    // matched-height skeleton to avoid CLS) onto a self-contained SVG chart
    // that SSRs normally. CLS safety now comes from CHART_HEIGHT being a
    // fixed constant on the always-rendered plot container, not a skeleton
    // swap — assert that invariant instead.
    const chart = read('src/components/dashboard/DashboardScoreTrendChart.tsx')
    expect(chart).toContain('const CHART_HEIGHT = 180')
    expect(chart).toContain("style={{ height: CHART_HEIGHT }}")
  })

  it('uses a tall dashboard skeleton instead of a short spinner', () => {
    const group = read('src/app/(dashboard)/loading.tsx')
    const route = read('src/app/(dashboard)/dashboard/loading.tsx')
    expect(group).not.toMatch(/animate-spin/)
    expect(group).toContain('min-h-[80dvh]')
    expect(route).toContain('DashboardPageSkeleton')
  })
})
