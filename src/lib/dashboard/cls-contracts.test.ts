import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SCORE_TREND_CHART_HEIGHT_PX } from '@/components/dashboard/score-trend-chart-height'

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

  it('shows the community card during SSR instead of hydrating it in', () => {
    const src = read('src/components/community/DashboardCommunityCard.tsx')
    expect(src).toContain('export const DASHBOARD_COMMUNITY_CARD_SERVER_VISIBLE = true')
    expect(src).toContain('() => DASHBOARD_COMMUNITY_CARD_SERVER_VISIBLE')
  })

  it('keeps the score-trend slot the same height as the Recharts container', () => {
    expect(SCORE_TREND_CHART_HEIGHT_PX).toBe(128)
    const chart = read('src/components/dashboard/ScoreTrendChart.tsx')
    const slot = read('src/components/dashboard/ScoreTrendChartSlot.tsx')
    const main = read('src/app/(dashboard)/dashboard/DashboardMain.tsx')
    expect(chart).toContain('SCORE_TREND_CHART_HEIGHT_PX')
    expect(slot).toContain('score-trend-chart-height')
    expect(slot).not.toContain("from '@/components/dashboard/ScoreTrendChart'")
    expect(main).toContain('SCORE_TREND_CHART_HEIGHT_PX')
  })

  it('uses a tall dashboard skeleton instead of a short spinner', () => {
    const group = read('src/app/(dashboard)/loading.tsx')
    const route = read('src/app/(dashboard)/dashboard/loading.tsx')
    expect(group).not.toMatch(/animate-spin/)
    expect(group).toContain('min-h-[80dvh]')
    expect(route).toContain('DashboardPageSkeleton')
  })
})
