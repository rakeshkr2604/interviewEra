'use client';

import { useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { TierDistributionChart } from './charts/TierDistributionChart';
import { ScoreTrendChart } from './charts/ScoreTrendChart';
import { SessionActivityHeatmap } from './charts/SessionActivityHeatmap';
import { PlacementReadyChart } from './charts/PlacementReadyChart';

interface TierDistribution {
  tier: number;
  count: number;
}

interface ScoreTrendPoint {
  date: string;
  score: number;
}

interface SessionDay {
  date: string;
  count: number;
}

interface PlacementReady {
  ready: number;
  almostReady: number;
  needsWork: number;
}

interface AnalyticsData {
  tierDistribution: TierDistribution[];
  scoreTrend: ScoreTrendPoint[];
  sessionActivity: SessionDay[];
  placementReady: PlacementReady;
  totalStudents: number;
  generatedAt: string;
}

type DateRange = '7' | '30' | '90' | 'all';

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

    csv.push('Score Trend (Last 30 Days)');
    csv.push('Date,Average Score');
    data.scoreTrend.forEach((item) => {
      csv.push(`${item.date},${item.score}`);
    });
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
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-600">No analytics data available. Invite students to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleDateRangeChange('7')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === '7'
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Last 7 days
          </button>
          <button
            onClick={() => handleDateRangeChange('30')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === '30'
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Last 30 days
          </button>
          <button
            onClick={() => handleDateRangeChange('90')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === '90'
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Last 90 days
          </button>
          <button
            onClick={() => handleDateRangeChange('all')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === 'all'
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All time
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Students</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{data.totalStudents}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Placement Ready</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{data.placementReady.ready}</p>
          <p className="text-xs text-gray-500">
            {data.totalStudents > 0 ? Math.round((data.placementReady.ready / data.totalStudents) * 100) : 0}%
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Almost Ready</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{data.placementReady.almostReady}</p>
          <p className="text-xs text-gray-500">
            {data.totalStudents > 0 ? Math.round((data.placementReady.almostReady / data.totalStudents) * 100) : 0}%
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Needs Work</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{data.placementReady.needsWork}</p>
          <p className="text-xs text-gray-500">
            {data.totalStudents > 0 ? Math.round((data.placementReady.needsWork / data.totalStudents) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tier Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tier Distribution</h2>
          {data.tierDistribution.some((t) => t.count > 0) ? (
            <TierDistributionChart data={data.tierDistribution} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Placement Ready Breakdown */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Placement Ready Breakdown</h2>
          <PlacementReadyChart data={data.placementReady} totalStudents={data.totalStudents} />
        </div>

        {/* Score Trend */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Trend (Last 30 Days)</h2>
          {data.scoreTrend.some((t) => t.score > 0) ? (
            <ScoreTrendChart data={data.scoreTrend} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No score data available
            </div>
          )}
        </div>

        {/* Session Activity */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Activity (Last 90 Days)</h2>
          {data.sessionActivity.some((s) => s.count > 0) ? (
            <SessionActivityHeatmap data={data.sessionActivity} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No session data available
            </div>
          )}
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500">
        Last updated: {new Date(data.generatedAt).toLocaleString('en-IN')}
      </div>
    </div>
  );
}
