'use client'

import dynamic from 'next/dynamic'
import { SCORE_TREND_CHART_HEIGHT_PX } from '@/components/dashboard/score-trend-chart-height'

const ScoreTrendChart = dynamic(
  () =>
    import('@/components/dashboard/ScoreTrendChart').then((m) => ({
      default: m.ScoreTrendChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full animate-pulse motion-reduce:animate-none rounded-lg"
        style={{
          height: SCORE_TREND_CHART_HEIGHT_PX,
          background: 'var(--bg-tertiary)',
        }}
        aria-hidden
      />
    ),
  },
)

export function ScoreTrendChartSlot({
  data,
}: {
  data: Array<{ label: string; score: number }>
}) {
  return <ScoreTrendChart data={data} />
}
