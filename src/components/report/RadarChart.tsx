'use client';

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { RadarDataPoint } from '@/types/app.types';
import { radarChartRowsFromRadar } from '@/lib/utils/report-radar-dimensions';

interface RadarChartProps {
  data: RadarDataPoint[];
}

const AXIS_TICK = { fontSize: 11, fill: 'var(--text-secondary)' };
const GRID_STROKE = 'color-mix(in srgb, var(--text-muted) 25%, transparent)';

export function RadarChart({ data }: RadarChartProps) {
  const chartData = radarChartRowsFromRadar(data);

  return (
    <div
      className="w-full min-h-[220px] sm:min-h-[260px]"
      role="img"
      aria-label="Radar chart showing scores across interview dimensions"
    >
      <ResponsiveContainer width="100%" height={260}>
        <RechartsRadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke={GRID_STROKE} />
          <PolarAngleAxis dataKey="dimension" tick={AXIS_TICK} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="var(--accent-primary)"
            fill="var(--accent-primary)"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
