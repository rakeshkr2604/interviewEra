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
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          style={{ fontSize: '14px' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '14px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value) => {
            if (typeof value !== 'number') return ['', ''];
            return [value.toString(), 'Students'];
          }}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
