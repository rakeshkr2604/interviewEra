'use client';

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface PlacementReady {
  ready: number;
  almostReady: number;
  needsWork: number;
}

interface PlacementReadyChartProps {
  data: PlacementReady;
  totalStudents: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f97316'];

export function PlacementReadyChart({ data, totalStudents }: PlacementReadyChartProps) {
  const chartData = [
    {
      name: 'Ready (Tier 3+)',
      value: data.ready,
      fill: '#22c55e',
    },
    {
      name: 'Almost Ready (Tier 2)',
      value: data.almostReady,
      fill: '#3b82f6',
    },
    {
      name: 'Needs Work (Tier 1)',
      value: data.needsWork,
      fill: '#f97316',
    },
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No student data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value, percent }) => {
            const percentage = percent ? (percent * 100).toFixed(0) : '0';
            return `${name}: ${value} (${percentage}%)`;
          }}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => {
            if (typeof value !== 'number') return ['', ''];
            const percentage = totalStudents > 0 ? Math.round((value / totalStudents) * 100) : 0;
            return [`${value} students (${percentage}%)`, 'Count'];
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
