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
import { REACT_TOPIC_IMPORTANCE } from '@/lib/seo/programmatic/react-hub';

const DATA = REACT_TOPIC_IMPORTANCE.map((item) => ({
  topic: item.topic,
  weight: item.weight,
}));

export function ReactTopicImportanceChart() {
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
          width={120}
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
          formatter={(value) => (typeof value === 'number' ? [`~${value}%`, 'Relative importance'] : [String(value), ''])}
          labelStyle={{ color: 'var(--text-secondary)' }}
        />
        <Bar dataKey="weight" radius={[0, 6, 6, 0]} fill="var(--accent-primary)" maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
