'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { SCORE_TREND_CHART_HEIGHT_PX } from '@/components/dashboard/score-trend-chart-height'

interface ScoreTrendPoint {
  label: string
  score: number
}

interface ScoreTrendChartProps {
  data: ScoreTrendPoint[]
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={SCORE_TREND_CHART_HEIGHT_PX}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value) =>
            typeof value === 'number' ? [`${value.toFixed(1)}/10`, 'Score'] : [String(value), 'Score']
          }
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--accent-primary)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
