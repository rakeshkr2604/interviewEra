'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TierDistribution {
  tier: number;
  count: number;
}

interface TierDistributionChartProps {
  data: TierDistribution[];
}

const TIER_LABELS = {
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3',
  4: 'Tier 4',
};

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

export function TierDistributionChart({ data }: TierDistributionChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: TIER_LABELS[item.tier as keyof typeof TIER_LABELS],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
        <XAxis
          dataKey="name"
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-secondary)', fontSize: 14 }}
        />
        <YAxis
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-secondary)', fontSize: 14 }}
        />
        <Tooltip
          contentStyle={getTooltipStyle()}
          formatter={(value) => {
            if (typeof value !== 'number') return ['', ''];
            return [value.toString(), 'Students'];
          }}
        />
        <Bar dataKey="count" fill="var(--accent-primary)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
