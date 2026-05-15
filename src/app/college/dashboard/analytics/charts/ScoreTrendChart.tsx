'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ScoreTrendPoint {
  date: string;
  score: number;
}

interface ScoreTrendChartProps {
  data: ScoreTrendPoint[];
}

function getTooltipStyle() {
  if (typeof window === 'undefined') return {};
  const s = getComputedStyle(document.documentElement);
  return {
    backgroundColor: s.getPropertyValue('--card-bg').trim() || '#ffffff',
    border: `1px solid ${s.getPropertyValue('--card-border').trim() || '#e5e7eb'}`,
    borderRadius: '8px',
    color: s.getPropertyValue('--text-primary').trim() || '#111827',
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  };
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
        <XAxis
          dataKey="date"
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-secondary)', fontSize: 12, angle: -45, textAnchor: 'end', dy: 8 }}
          height={60}
        />
        <YAxis
          domain={[0, 10]}
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-secondary)', fontSize: 14 }}
          label={{ value: 'Average Score', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={getTooltipStyle()}
          formatter={(value) => {
            if (typeof value !== 'number') return ['', ''];
            return [value.toFixed(1), 'Avg Score'];
          }}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--accent-primary)"
          dot={{ fill: 'var(--accent-primary)', r: 4 }}
          activeDot={{ r: 6 }}
          strokeWidth={2}
          name="Average Score"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
