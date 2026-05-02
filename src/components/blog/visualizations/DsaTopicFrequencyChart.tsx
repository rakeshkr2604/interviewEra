'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** Illustrative relative frequency — composite of common OA + technical round patterns (not live data). */
const DATA = [
  { topic: 'Arrays & hashing', weight: 94 },
  { topic: 'Two pointers / sliding window', weight: 81 },
  { topic: 'Binary search (incl. on answer)', weight: 72 },
  { topic: 'Linked lists', weight: 68 },
  { topic: 'Trees & BST', weight: 76 },
  { topic: 'Graphs (BFS/DFS)', weight: 64 },
  { topic: 'Dynamic programming', weight: 58 },
  { topic: 'Heaps / priority queue', weight: 52 },
  { topic: 'Stacks / monotonic', weight: 49 },
  { topic: 'Bit manipulation', weight: 38 },
];

export function DsaTopicFrequencyChart() {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={320}>
      <BarChart
        layout="vertical"
        data={DATA}
        margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
        barCategoryGap={6}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={{ stroke: 'var(--card-border)' }}
        />
        <YAxis
          type="category"
          dataKey="topic"
          width={168}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={{ stroke: 'var(--card-border)' }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
          }}
          formatter={(value) => (typeof value === 'number' ? [`~${value}%`, 'Relative ask rate'] : [String(value), ''])}
          labelStyle={{ color: 'var(--text-secondary)' }}
        />
        <Bar dataKey="weight" radius={[0, 6, 6, 0]} fill="var(--accent-primary)" maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
