'use client';

import { useState } from 'react';

interface SessionDay {
  date: string;
  count: number;
}

interface SessionActivityHeatmapProps {
  data: SessionDay[];
}

function getCellStyle(count: number, maxCount: number): React.CSSProperties {
  if (count === 0) {
    return { background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' };
  }
  const intensity = count / maxCount;
  // Use accent-primary with increasing opacity for heat levels
  const opacity = intensity <= 0.25 ? 0.2 : intensity <= 0.5 ? 0.45 : intensity <= 0.75 ? 0.7 : 1;
  return {
    background: `color-mix(in srgb, var(--accent-primary) ${Math.round(opacity * 100)}%, transparent)`,
    border: '1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)',
  };
}

const LEGEND_LEVELS = [
  { label: 'None', opacity: 0 },
  { label: 'Low', opacity: 0.2 },
  { label: 'Medium', opacity: 0.45 },
  { label: 'High', opacity: 0.7 },
  { label: 'Very High', opacity: 1 },
];

function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00');
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
}

export function SessionActivityHeatmap({ data }: SessionActivityHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  if (data.length === 0) {
    return <div className="text-center" style={{ color: 'var(--text-muted)' }}>No session data</div>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const weeks: Record<number, SessionDay[]> = {};

  data.forEach((day) => {
    const weekNum = getWeekNumber(day.date);
    if (!weeks[weekNum]) {
      weeks[weekNum] = [];
    }
    weeks[weekNum].push(day);
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Day labels */}
        <div className="mb-2 flex gap-1">
          <div className="w-12" />
          {dayNames.map((day) => (
            <div
              key={day}
              className="h-10 w-10 flex items-center justify-center text-xs font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="space-y-1">
          {Object.keys(weeks)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((weekStr) => {
              const weekNum = parseInt(weekStr);
              const weekDays = weeks[weekNum];
              const allDays: (SessionDay | null)[] = Array(7).fill(null);

              weekDays.forEach((day) => {
                const dayOfWeek = new Date(day.date + 'T00:00:00').getDay();
                allDays[dayOfWeek] = day;
              });

              return (
                <div key={weekNum} className="flex gap-1">
                  <div className="w-12 flex items-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    W{weekNum}
                  </div>
                  {allDays.map((day, idx) => {
                    if (!day) {
                      return <div key={idx} className="h-10 w-10" />;
                    }

                    return (
                      <div
                        key={day.date}
                        className="h-10 w-10 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={getCellStyle(day.count, maxCount)}
                        onMouseEnter={() => setHoveredDate(day.date)}
                        onMouseLeave={() => setHoveredDate(null)}
                        title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                      >
                        {hoveredDate === day.date && day.count > 0 && (
                          <span className="text-xs font-semibold text-white">{day.count}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Activity:</span>
          {LEGEND_LEVELS.map(({ label, opacity }) => (
            <div key={label} className="flex gap-1.5 items-center">
              <div
                className="h-5 w-5 rounded"
                style={
                  opacity === 0
                    ? { background: 'var(--bg-secondary)', border: '1px solid var(--card-border)' }
                    : {
                        background: `color-mix(in srgb, var(--accent-primary) ${Math.round(opacity * 100)}%, transparent)`,
                        border: '1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)',
                      }
                }
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
