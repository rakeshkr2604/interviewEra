import { createServiceClient } from '@/lib/supabase/server';
import { chunkIds } from '@/lib/dashboard/id-chunks';
import type { AnalyticsPayload } from './types';

async function selectByUserChunks<T>(
  queryFactory: (ids: string[]) => PromiseLike<{ data: T[] | null }>,
  userIds: string[],
): Promise<T[]> {
  const rows: T[] = [];
  for (const ids of chunkIds(userIds)) {
    const { data } = await queryFactory(ids);
    if (data?.length) rows.push(...data);
  }
  return rows;
}

export async function computeCampusAnalytics(
  collegeId: string,
  range: string
): Promise<AnalyticsPayload> {
  const serviceClient = createServiceClient();

  const { data: enrollments } = await serviceClient
    .from('college_enrollments')
    .select('user_id, branch, enrollment_status')
    .eq('college_id', collegeId)
    .eq('enrollment_status', 'active');

  if (!enrollments || enrollments.length === 0) {
    return {
      tierDistribution: [],
      scoreTrend: [],
      sessionActivity: [],
      placementReady: { ready: 0, almostReady: 0, needsWork: 0 },
      branchBreakdown: [],
      completionRate: 0,
      totalStudents: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  const studentIds = enrollments.map((e) => e.user_id);
  const branchByUser = new Map(
    enrollments.map((e) => [e.user_id, e.branch ?? 'Unassigned'])
  );

  let days = 30;
  if (range === '7') days = 7;
  if (range === '90') days = 90;
  if (range === 'all') days = 365;
  const fetchDays = Math.max(days, 90);
  const fetchSince = new Date();
  fetchSince.setDate(fetchSince.getDate() - fetchDays);
  const fetchSinceIso = fetchSince.toISOString();

  const [progressRecords, allInterviewCount, completedCount, interviews] = await Promise.all([
    selectByUserChunks(
      (ids) =>
        serviceClient
          .from('user_progress')
          .select('user_id, current_tier, overall_avg_score')
          .in('user_id', ids),
      studentIds,
    ),
    selectByUserChunks(
      async (ids) => {
        const { count } = await serviceClient
          .from('interviews')
          .select('id', { count: 'exact', head: true })
          .in('user_id', ids);
        return { data: [{ n: count ?? 0 }] };
      },
      studentIds,
    ).then((rows) => rows.reduce((sum, row) => sum + row.n, 0)),
    selectByUserChunks(
      async (ids) => {
        const { count } = await serviceClient
          .from('interviews')
          .select('id', { count: 'exact', head: true })
          .in('user_id', ids)
          .eq('status', 'completed');
        return { data: [{ n: count ?? 0 }] };
      },
      studentIds,
    ).then((rows) => rows.reduce((sum, row) => sum + row.n, 0)),
    selectByUserChunks(
      (ids) =>
        serviceClient
          .from('interviews')
          .select('id, user_id, completed_at, status')
          .in('user_id', ids)
          .eq('status', 'completed')
          .gte('completed_at', fetchSinceIso),
      studentIds,
    ),
  ]);

  const completedInterviews = interviews;
  const completedIds = completedInterviews.map((i) => i.id);

  const reports = [];
  for (const ids of chunkIds(completedIds)) {
    const { data } = await serviceClient
      .from('reports')
      .select('interview_id, overall_score, generated_at')
      .in('interview_id', ids);
    if (data?.length) reports.push(...data);
  }

  const tierDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const placementReady = { ready: 0, almostReady: 0, needsWork: 0 };
  const branchStats = new Map<string, { count: number; scores: number[]; ready: number }>();

  for (const enrollment of enrollments) {
    const branch = branchByUser.get(enrollment.user_id) ?? 'Unassigned';
    if (!branchStats.has(branch)) {
      branchStats.set(branch, { count: 0, scores: [], ready: 0 });
    }
    branchStats.get(branch)!.count += 1;
  }

  (progressRecords ?? []).forEach((p) => {
    const tier = p.current_tier || 1;
    tierDistribution[tier as keyof typeof tierDistribution]++;

    if (tier >= 3) placementReady.ready += 1;
    else if (tier === 2) placementReady.almostReady += 1;
    else placementReady.needsWork += 1;

    const branch = branchByUser.get(p.user_id) ?? 'Unassigned';
    const stats = branchStats.get(branch);
    if (stats && p.overall_avg_score !== null) {
      stats.scores.push(Number(p.overall_avg_score));
      if (tier >= 3) stats.ready += 1;
    }
  });

  const lastNDays = new Date();
  lastNDays.setDate(lastNDays.getDate() - days);

  const reportsByDate: Record<string, number[]> = {};
  (reports ?? []).forEach((r) => {
    if (r.generated_at && new Date(r.generated_at) >= lastNDays) {
      const date = new Date(r.generated_at).toISOString().split('T')[0];
      if (!reportsByDate[date]) reportsByDate[date] = [];
      if (r.overall_score !== null) reportsByDate[date].push(r.overall_score);
    }
  });

  const scoreTrend = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const scores = reportsByDate[dateStr] ?? [];
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    scoreTrend.push({
      date: new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      score: Math.round(avgScore * 10) / 10,
    });
  }

  const last90Days = new Date();
  last90Days.setDate(last90Days.getDate() - 90);

  const sessionsByDate: Record<string, number> = {};
  completedInterviews.forEach((interview) => {
    if (interview.completed_at && new Date(interview.completed_at) >= last90Days) {
      const date = new Date(interview.completed_at).toISOString().split('T')[0];
      sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
    }
  });

  const sessionActivity = [];
  for (let i = 89; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    sessionActivity.push({ date: dateStr, count: sessionsByDate[dateStr] || 0 });
  }

  const completionRate =
    allInterviewCount > 0
      ? Math.round((completedCount / allInterviewCount) * 100)
      : 0;

  const branchBreakdown = Array.from(branchStats.entries())
    .map(([branch, stats]) => ({
      branch,
      studentCount: stats.count,
      avgScore:
        stats.scores.length > 0
          ? Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) * 10) / 10
          : null,
      placementReady: stats.ready,
    }))
    .sort((a, b) => b.studentCount - a.studentCount);

  return {
    tierDistribution: [
      { tier: 1, count: tierDistribution[1] },
      { tier: 2, count: tierDistribution[2] },
      { tier: 3, count: tierDistribution[3] },
      { tier: 4, count: tierDistribution[4] },
    ],
    scoreTrend,
    sessionActivity,
    placementReady,
    branchBreakdown,
    completionRate,
    totalStudents: enrollments.length,
    generatedAt: new Date().toISOString(),
  };
}
