'use client';

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const DATA = [
  { dimension: 'Clarity', generic: 4, strong: 9 },
  { dimension: 'Structure', generic: 3, strong: 9 },
  { dimension: 'Specificity', generic: 3, strong: 8 },
  { dimension: 'Honesty', generic: 5, strong: 9 },
  { dimension: 'Confidence', generic: 4, strong: 8 },
];

export function HrAnswerQualityRadar() {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
      <RadarChart data={DATA} margin={{ top: 16, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke="var(--card-border)" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            color: 'var(--text-primary)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Radar
          name="Generic / vague"
          dataKey="generic"
          stroke="var(--text-muted)"
          fill="var(--text-muted)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Radar
          name="After tips (target)"
          dataKey="strong"
          stroke="var(--accent-primary)"
          fill="var(--accent-primary)"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
