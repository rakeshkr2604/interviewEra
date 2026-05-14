'use client';

import { useState } from 'react';

interface SessionDay {
  date: string;
  count: number;
}

interface SessionActivityHeatmapProps {
  data: SessionDay[];
}

function getColor(count: number, maxCount: number): string {
  if (count === 0) return 'bg-gray-100';
  const intensity = count / maxCount;

  if (intensity <= 0.25) return 'bg-blue-100';
  if (intensity <= 0.5) return 'bg-blue-300';
  if (intensity <= 0.75) return 'bg-blue-500';
  return 'bg-blue-700';
}

function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00');
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
}

export function SessionActivityHeatmap({ data }: SessionActivityHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  if (data.length === 0) {
    return <div className="text-center text-gray-500">No session data</div>;
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
              className="h-10 w-10 flex items-center justify-center text-xs font-medium text-gray-600"
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
                  <div className="w-12 flex items-center text-xs text-gray-500">
                    W{weekNum}
                  </div>
                  {allDays.map((day, idx) => {
                    if (!day) {
                      return <div key={idx} className="h-10 w-10" />;
                    }

                    return (
                      <div
                        key={day.date}
                        className={`h-10 w-10 rounded border border-gray-300 flex items-center justify-center cursor-pointer transition-all ${getColor(day.count, maxCount)}`}
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
        <div className="mt-6 flex items-center gap-4">
          <span className="text-sm text-gray-600">Activity:</span>
          <div className="flex gap-1 items-center">
            <div className="h-6 w-6 bg-gray-100 border border-gray-300 rounded text-xs" />
            <span className="text-xs text-gray-600">None</span>
          </div>
          <div className="flex gap-1 items-center">
            <div className="h-6 w-6 bg-blue-100 border border-gray-300 rounded text-xs" />
            <span className="text-xs text-gray-600">Low</span>
          </div>
          <div className="flex gap-1 items-center">
            <div className="h-6 w-6 bg-blue-300 border border-gray-300 rounded text-xs" />
            <span className="text-xs text-gray-600">Medium</span>
          </div>
          <div className="flex gap-1 items-center">
            <div className="h-6 w-6 bg-blue-500 border border-gray-300 rounded text-xs" />
            <span className="text-xs text-gray-600">High</span>
          </div>
          <div className="flex gap-1 items-center">
            <div className="h-6 w-6 bg-blue-700 border border-gray-300 rounded text-xs" />
            <span className="text-xs text-gray-600">Very High</span>
          </div>
        </div>
      </div>
    </div>
  );
}
