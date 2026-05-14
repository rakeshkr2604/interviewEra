import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const collegeId = request.nextUrl.searchParams.get('collegeId');
  const range = request.nextUrl.searchParams.get('range') || '30';

  if (!collegeId) {
    return NextResponse.json({ error: 'Missing collegeId' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { data: enrollments } = await serviceClient
    .from('college_enrollments')
    .select('user_id, enrollment_status')
    .eq('college_id', collegeId)
    .eq('enrollment_status', 'active');

  if (!enrollments || enrollments.length === 0) {
    const emptyData: AnalyticsData = {
      tierDistribution: [],
      scoreTrend: [],
      sessionActivity: [],
      placementReady: { ready: 0, almostReady: 0, needsWork: 0 },
      totalStudents: 0,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(emptyData);
  }

  const studentIds = enrollments.map((e) => e.user_id);

  const { data: progressRecords } = await serviceClient
    .from('user_progress')
    .select('user_id, current_tier, overall_avg_score')
    .in('user_id', studentIds);

  const { data: interviews } = await serviceClient
    .from('interviews')
    .select('id, user_id, completed_at, status')
    .in('user_id', studentIds)
    .eq('status', 'completed');

  const { data: reports } = await serviceClient
    .from('reports')
    .select('interview_id, overall_score, generated_at')
    .in('interview_id', (interviews ?? []).map((i) => i.id));

  const tierDistribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };

  const placementReady = { ready: 0, almostReady: 0, needsWork: 0 };

  (progressRecords ?? []).forEach((p) => {
    const tier = p.current_tier || 1;
    tierDistribution[tier as keyof typeof tierDistribution]++;

    if (tier >= 3) {
      placementReady.ready += 1;
    } else if (tier === 2) {
      placementReady.almostReady += 1;
    } else {
      placementReady.needsWork += 1;
    }
  });

  let days = 30;
  if (range === '7') days = 7;
  if (range === '90') days = 90;
  if (range === 'all') days = 365;

  const lastNDays = new Date();
  lastNDays.setDate(lastNDays.getDate() - days);

  const reportsByDate: Record<string, number[]> = {};
  (reports ?? []).forEach((r) => {
    if (r.generated_at && new Date(r.generated_at) >= lastNDays) {
      const date = new Date(r.generated_at).toISOString().split('T')[0];
      if (!reportsByDate[date]) {
        reportsByDate[date] = [];
      }
      if (r.overall_score !== null) {
        reportsByDate[date].push(r.overall_score);
      }
    }
  });

  const scoreTrend: ScoreTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const scores = reportsByDate[dateStr] ?? [];
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    scoreTrend.push({
      date:
        range === '7'
          ? new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          : new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      score: Math.round(avgScore * 10) / 10,
    });
  }

  const last90Days = new Date();
  last90Days.setDate(last90Days.getDate() - 90);

  const sessionsByDate: Record<string, number> = {};
  (interviews ?? []).forEach((interview) => {
    if (interview.completed_at && new Date(interview.completed_at) >= last90Days) {
      const date = new Date(interview.completed_at).toISOString().split('T')[0];
      sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
    }
  });

  const sessionActivity: SessionDay[] = [];
  for (let i = 89; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    sessionActivity.push({
      date: dateStr,
      count: sessionsByDate[dateStr] || 0,
    });
  }

  const data: AnalyticsData = {
    tierDistribution: [
      { tier: 1, count: tierDistribution[1] },
      { tier: 2, count: tierDistribution[2] },
      { tier: 3, count: tierDistribution[3] },
      { tier: 4, count: tierDistribution[4] },
    ],
    scoreTrend,
    sessionActivity,
    placementReady,
    totalStudents: enrollments.length,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(data);
}
