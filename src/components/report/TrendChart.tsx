'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RadarDataPoint } from '@/types/app.types';

interface TrendChartProps {
  data: RadarDataPoint[];
}

const AXIS_TICK = { fontSize: 11, fill: 'var(--text-secondary)' };

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div
      className="w-full min-h-[180px] sm:min-h-[200px]"
      role="img"
      aria-label="Line chart showing score trend across recent interviews"
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="color-mix(in srgb, var(--text-muted) 20%, transparent)"
            vertical={false}
          />
          <XAxis dataKey="dimension" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis
            domain={[0, 10]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            formatter={(value) =>
              typeof value === 'number' ? [value.toFixed(1), 'Score'] : [String(value), 'Score']
            }
            contentStyle={{
              background: 'var(--card-bg)',
              border: '2px solid var(--card-border)',
              borderRadius: 'var(--ie-radius-md)',
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
            labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--accent-primary)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--accent-primary)', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: 'var(--accent-primary)', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
