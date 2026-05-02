'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** Illustrative readiness curve — weeks vs self-rated readiness (1–10) for three tracks. */
const DATA = [
  { week: 1, foundations: 2.5, patterns: 1.5, mocks: 1 },
  { week: 2, foundations: 4, patterns: 2, mocks: 1.2 },
  { week: 3, foundations: 5.5, patterns: 3.5, mocks: 2 },
  { week: 4, foundations: 6.5, patterns: 4.5, mocks: 2.8 },
  { week: 5, foundations: 7.2, patterns: 5.5, mocks: 3.8 },
  { week: 6, foundations: 7.8, patterns: 6.5, mocks: 5 },
  { week: 7, foundations: 8.2, patterns: 7.2, mocks: 6.2 },
  { week: 8, foundations: 8.5, patterns: 7.8, mocks: 7 },
  { week: 9, foundations: 8.7, patterns: 8.3, mocks: 7.8 },
  { week: 10, foundations: 8.9, patterns: 8.7, mocks: 8.5 },
];

export function DsaPrepTimelineChart() {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={280}>
      <LineChart data={DATA} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={{ stroke: 'var(--card-border)' }}
          label={{ value: 'Week', position: 'insideBottom', offset: -4, fill: 'var(--text-muted)', fontSize: 11 }}
        />
        <YAxis
          domain={[0, 10]}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={{ stroke: 'var(--card-border)' }}
          label={{ value: 'Readiness', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line
          type="monotone"
          dataKey="foundations"
          name="Core DS (arrays, strings, LL)"
          stroke="var(--accent-primary)"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
        <Line
          type="monotone"
          dataKey="patterns"
          name="Patterns (trees, graphs, DP)"
          stroke="#7c3aed"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
        <Line
          type="monotone"
          dataKey="mocks"
          name="Mock interviews"
          stroke="var(--accent-success)"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
