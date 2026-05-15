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

// Semantic colors — readable in both light and dark mode
const SLICE_COLORS = ['#22c55e', '#6366f1', '#f97316'];

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

export function PlacementReadyChart({ data, totalStudents }: PlacementReadyChartProps) {
  const chartData = [
    { name: 'Ready (Tier 3+)', value: data.ready, fill: SLICE_COLORS[0] },
    { name: 'Almost Ready (Tier 2)', value: data.almostReady, fill: SLICE_COLORS[1] },
    { name: 'Needs Work (Tier 1)', value: data.needsWork, fill: SLICE_COLORS[2] },
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
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
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={getTooltipStyle()}
          formatter={(value) => {
            if (typeof value !== 'number') return ['', ''];
            const percentage = totalStudents > 0 ? Math.round((value / totalStudents) * 100) : 0;
            return [`${value} students (${percentage}%)`, 'Count'];
          }}
        />
        <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
