'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw, Download } from 'lucide-react';

const ChartSkeleton = () => (
  <div className="flex items-center justify-center h-64 animate-pulse rounded-xl" style={{ background: 'var(--bg-secondary)' }} />
);

const TierDistributionChart = dynamic(
  () => import('./charts/TierDistributionChart').then((m) => ({ default: m.TierDistributionChart })),
  { loading: ChartSkeleton, ssr: false }
);
const ScoreTrendChart = dynamic(
  () => import('./charts/ScoreTrendChart').then((m) => ({ default: m.ScoreTrendChart })),
  { loading: ChartSkeleton, ssr: false }
);
const SessionActivityHeatmap = dynamic(
  () => import('./charts/SessionActivityHeatmap').then((m) => ({ default: m.SessionActivityHeatmap })),
  { loading: ChartSkeleton, ssr: false }
);
const PlacementReadyChart = dynamic(
  () => import('./charts/PlacementReadyChart').then((m) => ({ default: m.PlacementReadyChart })),
  { loading: ChartSkeleton, ssr: false }
);

import type { AnalyticsPayload } from '@/lib/college/types';

type AnalyticsData = AnalyticsPayload;

type DateRange = '7' | '30' | '90' | 'all';

const RANGE_LABELS: Record<DateRange, string> = {
  '7': 'Last 7 days',
  '30': 'Last 30 days',
  '90': 'Last 90 days',
  all: 'All time',
};

interface AnalyticsContentProps {
  initialData: AnalyticsData | null;
  collegeId: string;
}

export function AnalyticsContent({ initialData, collegeId }: AnalyticsContentProps) {
  const [data, setData] = useState<AnalyticsData | null>(initialData);
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      const response = await fetch(`/api/college/analytics?collegeId=${collegeId}&range=${dateRange}`);
      if (response.ok) {
        const newData = (await response.json()) as AnalyticsData;
        setData(newData);
      }
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDateRangeChange(range: DateRange) {
    setDateRange(range);
    setLoading(true);
    try {
      const response = await fetch(`/api/college/analytics?collegeId=${collegeId}&range=${range}`);
      if (response.ok) {
        const newData = (await response.json()) as AnalyticsData;
        setData(newData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCSV() {
    if (!data) return;

    const csv: string[] = [];

    csv.push('InterviewEra Analytics Export');
    csv.push(`Generated: ${new Date(data.generatedAt).toLocaleString('en-IN')}`);
    csv.push('');

    csv.push('Tier Distribution');
    csv.push('Tier,Count');
    data.tierDistribution.forEach((item) => {
      csv.push(`Tier ${item.tier},${item.count}`);
    });
    csv.push('');

    csv.push('Score Trend');
    csv.push('Date,Average Score');
    data.scoreTrend.forEach((item) => {
      csv.push(`${item.date},${item.score}`);
    });
    csv.push('');

    csv.push('Department Analytics');
    csv.push('Branch,Students,Avg Score,Placement Ready');
    data.branchBreakdown.forEach((item) => {
      csv.push(`${item.branch},${item.studentCount},${item.avgScore ?? ''},${item.placementReady}`);
    });
    csv.push('');

    csv.push(`Completion Rate,${data.completionRate}%`);
    csv.push('');

    csv.push('Placement Ready Breakdown');
    csv.push('Category,Count,Percentage');
    csv.push(`Ready (Tier 3+),${data.placementReady.ready},${data.totalStudents > 0 ? Math.round((data.placementReady.ready / data.totalStudents) * 100) : 0}%`);
    csv.push(`Almost Ready (Tier 2),${data.placementReady.almostReady},${data.totalStudents > 0 ? Math.round((data.placementReady.almostReady / data.totalStudents) * 100) : 0}%`);
    csv.push(`Needs Work (Tier 1),${data.placementReady.needsWork},${data.totalStudents > 0 ? Math.round((data.placementReady.needsWork / data.totalStudents) * 100) : 0}%`);
    csv.push('');

    csv.push('Session Activity (Last 90 Days)');
    csv.push('Date,Sessions Completed');
    data.sessionActivity.forEach((item) => {
      csv.push(`${item.date},${item.count}`);
    });

    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  if (!data) {
    return (
      <div className="dashboard-premium-card p-12 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>No analytics data available. Invite students to get started.</p>
      </div>
    );
  }

  const rangeButtonStyle = (active: boolean) =>
    active
      ? { background: 'var(--accent-primary)', color: '#fff' }
      : { border: '1.5px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div
        className="dashboard-premium-card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap gap-2">
          {(['7', '30', '90', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => handleDateRangeChange(range)}
              className="rounded-xl px-3 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5"
              style={rangeButtonStyle(dateRange === range)}
            >
              {range === '7' ? 'Last 7 days' : range === '30' ? 'Last 30 days' : range === '90' ? 'Last 90 days' : 'All time'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="dashboard-premium-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Total Students</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{data.totalStudents}</p>
        </div>
        <div className="dashboard-premium-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Placement Ready</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--accent-success)' }}>{data.placementReady.ready}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {data.totalStudents > 0 ? Math.round((data.placementReady.ready / data.totalStudents) * 100) : 0}%
          </p>
        </div>
        <div className="dashboard-premium-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Almost Ready</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--accent-primary)' }}>{data.placementReady.almostReady}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {data.totalStudents > 0 ? Math.round((data.placementReady.almostReady / data.totalStudents) * 100) : 0}%
          </p>
        </div>
        <div className="dashboard-premium-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Needs Work</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--accent-warning)' }}>{data.placementReady.needsWork}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {data.totalStudents > 0 ? Math.round((data.placementReady.needsWork / data.totalStudents) * 100) : 0}%
          </p>
        </div>
        <div className="dashboard-premium-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Completion Rate</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{data.completionRate}%</p>
        </div>
      </div>

      {data.branchBreakdown.length > 0 && (
        <div className="dashboard-premium-card overflow-hidden" style={{ padding: 0 }}>
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--card-border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Department Analytics</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase">Branch</th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase">Students</th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase">Avg Score</th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase">Placement Ready</th>
                </tr>
              </thead>
              <tbody>
                {data.branchBreakdown.map((row) => (
                  <tr key={row.branch} className="border-t" style={{ borderColor: 'var(--card-border)' }}>
                    <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{row.branch}</td>
                    <td className="px-5 py-3 text-center">{row.studentCount}</td>
                    <td className="px-5 py-3 text-center">{row.avgScore ?? '—'}</td>
                    <td className="px-5 py-3 text-center">{row.placementReady}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tier Distribution */}
        <div className="dashboard-premium-card p-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Tier Distribution</h2>
          {data.tierDistribution.some((t) => t.count > 0) ? (
            <TierDistributionChart data={data.tierDistribution} />
          ) : (
            <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
              No data available
            </div>
          )}
        </div>

        {/* Placement Ready Breakdown */}
        <div className="dashboard-premium-card p-5">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Placement Ready Breakdown</h2>
          <PlacementReadyChart data={data.placementReady} totalStudents={data.totalStudents} />
        </div>

        {/* Score Trend */}
        <div className="dashboard-premium-card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Score Trend ({RANGE_LABELS[dateRange]})
          </h2>
          {data.scoreTrend.some((t) => t.score > 0) ? (
            <ScoreTrendChart data={data.scoreTrend} />
          ) : (
            <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
              No score data available
            </div>
          )}
        </div>

        {/* Session Activity */}
        <div className="dashboard-premium-card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Session Activity (Last 90 Days)</h2>
          {data.sessionActivity.some((s) => s.count > 0) ? (
            <SessionActivityHeatmap data={data.sessionActivity} />
          ) : (
            <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
              No session data available
            </div>
          )}
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Last updated: {new Date(data.generatedAt).toLocaleString('en-IN')}
      </div>
    </div>
  );
}
