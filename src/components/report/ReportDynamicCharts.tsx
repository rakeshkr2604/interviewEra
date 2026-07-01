'use client';

import dynamic from 'next/dynamic';

const chartFallback = (
  <div
    className="w-full min-h-[220px] animate-pulse rounded-xl sm:min-h-[260px]"
    style={{ background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }}
    aria-hidden
  />
);

export const RadarChart = dynamic(
  () => import('@/components/report/RadarChart').then((mod) => mod.RadarChart),
  { ssr: false, loading: () => chartFallback }
);

export const TrendChart = dynamic(
  () => import('@/components/report/TrendChart').then((mod) => mod.TrendChart),
  { ssr: false, loading: () => (
    <div
      className="w-full min-h-[180px] animate-pulse rounded-xl sm:min-h-[200px]"
      style={{ background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)' }}
      aria-hidden
    />
  ) }
);
