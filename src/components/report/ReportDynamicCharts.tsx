'use client';

import dynamic from 'next/dynamic';

export const RadarChart = dynamic(
  () => import('@/components/report/RadarChart').then((mod) => mod.RadarChart),
  { ssr: false }
);

export const TrendChart = dynamic(
  () => import('@/components/report/TrendChart').then((mod) => mod.TrendChart),
  { ssr: false }
);
