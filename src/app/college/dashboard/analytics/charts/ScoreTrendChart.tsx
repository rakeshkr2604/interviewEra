'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ScoreTrendPoint {
  date: string;
  score: number;
}

interface ScoreTrendChartProps {
  data: ScoreTrendPoint[];
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tick={{ angle: -45, textAnchor: 'end', height: 80 }}
        />
        <YAxis
          domain={[0, 10]}
          stroke="#6b7280"
          style={{ fontSize: '14px' }}
          label={{ value: 'Average Score', angle: -90, position: 'insideLeft' }}
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
            return [value.toFixed(1), 'Avg Score'];
          }}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#06b6d4"
          dot={{ fill: '#06b6d4', r: 4 }}
          activeDot={{ r: 6 }}
          strokeWidth={2}
          name="Average Score"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
