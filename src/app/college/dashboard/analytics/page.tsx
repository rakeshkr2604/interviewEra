import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { AnalyticsContent } from './AnalyticsContent';

export const metadata = privatePageMetadata({
  title: 'Analytics',
  description: 'View cohort performance analytics and insights.',
  path: '/college/dashboard/analytics',
});

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

async function getAnalyticsData(collegeId: string): Promise<AnalyticsData | null> {
  const serviceClient = createServiceClient();

  const { data: enrollments } = await serviceClient
    .from('college_enrollments')
    .select('user_id, enrollment_status')
    .eq('college_id', collegeId)
    .eq('enrollment_status', 'active');

  if (!enrollments || enrollments.length === 0) {
    return {
      tierDistribution: [],
      scoreTrend: [],
      sessionActivity: [],
      placementReady: { ready: 0, almostReady: 0, needsWork: 0 },
      totalStudents: 0,
      generatedAt: new Date().toISOString(),
    };
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

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const reportsByDate: Record<string, number[]> = {};
  (reports ?? []).forEach((r) => {
    if (r.generated_at) {
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
  for (let i = 29; i >= 0; i--) {
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
  (interviews ?? []).forEach((interview) => {
    if (interview.completed_at) {
      const date = new Date(interview.completed_at).toISOString().split('T')[0];
      if (new Date(date) >= last90Days) {
        sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
      }
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
    totalStudents: enrollments.length,
    generatedAt: new Date().toISOString(),
  };
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name')
    .eq('admin_user_id', user.id)
    .single();

  if (!org) redirect('/college/signup');

  const data = await getAnalyticsData(org.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Analytics</h1>
        <p className="mt-2 text-sm text-gray-600">
          Cohort performance insights and placement readiness tracking.
        </p>
      </div>

      <AnalyticsContent initialData={data} collegeId={org.id} />
    </div>
  );
}
