/**
 * Founder funnel metrics — computed from transactional tables + product_events.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type FunnelStepKey =
  | 'landing'
  | 'signup'
  | 'verification'
  | 'resume'
  | 'interview_started'
  | 'interview_completed'
  | 'report_viewed'
  | 'return_visit'
  | 'paid';

export interface FunnelStepMetric {
  key: FunnelStepKey;
  label: string;
  count: number;
  conversion_pct: number | null;
  drop_off_pct: number | null;
  event_names: string[];
  missing_tracking: string[];
  recommended_improvements: string[];
}

export interface FunnelMetricsResult {
  range_days: number;
  cohort_signups: number;
  steps: FunnelStepMetric[];
  generated_at: string;
}

const STEP_META: Record<
  FunnelStepKey,
  { label: string; events: string[]; missing: string[]; improvements: string[] }
> = {
  landing: {
    label: 'Landing visit',
    events: ['page_view', 'landing_cta_clicked'],
    missing: [],
    improvements: ['Segment landing page_view by UTM for campaign attribution'],
  },
  signup: {
    label: 'Signup',
    events: ['signup_completed', 'signup_started'],
    missing: [],
    improvements: ['Track signup_started → signup_completed drop-off by method'],
  },
  verification: {
    label: 'Email verified',
    events: ['verification_completed'],
    missing: ['OAuth users skip verification — segment by auth method'],
    improvements: ['Resend verification nudge at +24h if unverified'],
  },
  resume: {
    label: 'Resume uploaded',
    events: ['resume_uploaded', 'upload_started'],
    missing: [],
    improvements: ['Onboarding reminder email if no resume after 48h'],
  },
  interview_started: {
    label: 'First interview started',
    events: ['mock_interview_started', 'interview_started'],
    missing: [],
    improvements: ['Credit balance CTA on dashboard if 0 credits'],
  },
  interview_completed: {
    label: 'First interview completed',
    events: ['mock_interview_completed', 'interview_completed'],
    missing: [],
    improvements: ['Abandon recovery email for incomplete sessions'],
  },
  report_viewed: {
    label: 'Report viewed',
    events: ['report_viewed', 'report_opened'],
    missing: [],
    improvements: ['Share report CTA on report page'],
  },
  return_visit: {
    label: 'Return visit (D7+)',
    events: ['dashboard_viewed'],
    missing: ['Explicit return_visit event'],
    improvements: ['Weekly digest + streak notifications'],
  },
  paid: {
    label: 'Paid conversion',
    events: ['payment_completed', 'payment_started'],
    missing: [],
    improvements: ['Pricing page social proof + limited-time offer test'],
  },
};

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

async function countUsersCreatedSince(
  svc: SupabaseClient,
  sinceIso: string,
): Promise<number> {
  const { count } = await svc
    .from('users')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sinceIso);
  return count ?? 0;
}

async function countCohortWithResume(
  svc: SupabaseClient,
  sinceIso: string,
): Promise<number> {
  const { data: cohort } = await svc
    .from('users')
    .select('id')
    .gte('created_at', sinceIso);
  const ids = (cohort ?? []).map((r) => r.id as string);
  if (ids.length === 0) return 0;

  const { data: resumes } = await svc
    .from('resumes')
    .select('user_id')
    .in('user_id', ids);
  return new Set((resumes ?? []).map((r) => r.user_id as string)).size;
}

/**
 * "Started" excludes 'pending' — a row stuck in 'pending' means question
 * generation never resolved (or the user left before it did), so the
 * candidate never actually began answering. Counting it as "started" both
 * inflates the started count and understates true started→completed
 * conversion (a denominator padded with sessions nobody could have finished).
 */
export async function countCohortFirstInterview(
  svc: SupabaseClient,
  sinceIso: string,
  completed: boolean,
): Promise<number> {
  const { data: cohort } = await svc
    .from('users')
    .select('id')
    .gte('created_at', sinceIso);
  const ids = (cohort ?? []).map((r) => r.id as string);
  if (ids.length === 0) return 0;

  let query = svc.from('interviews').select('user_id').in('user_id', ids);
  query = completed ? query.eq('status', 'completed') : query.neq('status', 'pending');
  const { data: rows } = await query;
  return new Set((rows ?? []).map((r) => r.user_id as string)).size;
}

async function countCohortReportViewed(svc: SupabaseClient, sinceIso: string): Promise<number> {
  const { data: cohort } = await svc
    .from('users')
    .select('id')
    .gte('created_at', sinceIso);
  const ids = (cohort ?? []).map((r) => r.id as string);
  if (ids.length === 0) return 0;

  const { count } = await svc
    .from('product_events')
    .select('user_id', { count: 'exact', head: true })
    .in('user_id', ids)
    .in('event_name', ['report_viewed', 'report_opened']);
  if (count && count > 0) {
    const { data: events } = await svc
      .from('product_events')
      .select('user_id')
      .in('user_id', ids)
      .in('event_name', ['report_viewed', 'report_opened']);
    return new Set((events ?? []).map((r) => r.user_id as string)).size;
  }

  const { data: interviews } = await svc
    .from('interviews')
    .select('id, user_id')
    .in('user_id', ids)
    .eq('status', 'completed');
  const interviewIds = (interviews ?? []).map((r) => r.id as string);
  if (interviewIds.length === 0) return 0;

  const { data: reports } = await svc
    .from('reports')
    .select('interview_id')
    .in('interview_id', interviewIds);
  const reportInterviewIds = new Set((reports ?? []).map((r) => r.interview_id as string));
  return new Set(
    (interviews ?? [])
      .filter((i) => reportInterviewIds.has(i.id as string))
      .map((i) => i.user_id as string),
  ).size;
}

async function countCohortReturnVisit(svc: SupabaseClient, sinceIso: string): Promise<number> {
  const { data: cohort } = await svc
    .from('users')
    .select('id, created_at')
    .gte('created_at', sinceIso);
  if (!cohort?.length) return 0;

  let returned = 0;
  for (const row of cohort) {
    const userId = row.id as string;
    const created = new Date(row.created_at as string).getTime();
    const d7 = created + 7 * 24 * 60 * 60 * 1000;
    const { data: activity } = await svc
      .from('user_activity')
      .select('last_seen_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (!activity?.last_seen_at) continue;
    const lastSeen = new Date(activity.last_seen_at as string).getTime();
    if (lastSeen >= d7) returned += 1;
  }
  return returned;
}

async function countCohortPaid(svc: SupabaseClient, sinceIso: string): Promise<number> {
  const { data: cohort } = await svc
    .from('users')
    .select('id')
    .gte('created_at', sinceIso);
  const ids = (cohort ?? []).map((r) => r.id as string);
  if (ids.length === 0) return 0;

  const { data: payments } = await svc
    .from('payments')
    .select('user_id')
    .in('user_id', ids)
    .eq('status', 'paid');
  return new Set((payments ?? []).map((r) => r.user_id as string)).size;
}

async function countProductEventsSince(
  svc: SupabaseClient,
  eventNames: string[],
  sinceIso: string,
): Promise<number> {
  const { count } = await svc
    .from('product_events')
    .select('id', { count: 'exact', head: true })
    .in('event_name', eventNames)
    .gte('created_at', sinceIso);
  return count ?? 0;
}

async function countVerificationCompleted(svc: SupabaseClient, sinceIso: string): Promise<number> {
  const eventCount = await countProductEventsSince(svc, ['verification_completed'], sinceIso);
  if (eventCount > 0) return eventCount;

  const { data: cohort } = await svc
    .from('users')
    .select('id')
    .gte('created_at', sinceIso);
  return cohort?.length ?? 0;
}

export async function computeFunnelMetrics(
  svc: SupabaseClient,
  rangeDays: number,
): Promise<FunnelMetricsResult> {
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  const [
    cohortSignups,
    pageViews,
    landingCta,
    resumeUsers,
    startedUsers,
    completedUsers,
    reportUsers,
    returnUsers,
    paidUsers,
    verifiedUsers,
  ] = await Promise.all([
    countUsersCreatedSince(svc, since),
    countProductEventsSince(svc, ['page_view'], since),
    countProductEventsSince(svc, ['landing_cta_clicked'], since),
    countCohortWithResume(svc, since),
    countCohortFirstInterview(svc, since, false),
    countCohortFirstInterview(svc, since, true),
    countCohortReportViewed(svc, since),
    countCohortReturnVisit(svc, since),
    countCohortPaid(svc, since),
    countVerificationCompleted(svc, since),
  ]);

  const landingCount = Math.max(pageViews, landingCta, cohortSignups);
  const rawCounts: Record<FunnelStepKey, number> = {
    landing: landingCount,
    signup: cohortSignups,
    verification: Math.min(verifiedUsers, cohortSignups),
    resume: resumeUsers,
    interview_started: startedUsers,
    interview_completed: completedUsers,
    report_viewed: reportUsers,
    return_visit: returnUsers,
    paid: paidUsers,
  };

  const order: FunnelStepKey[] = [
    'landing',
    'signup',
    'verification',
    'resume',
    'interview_started',
    'interview_completed',
    'report_viewed',
    'return_visit',
    'paid',
  ];

  const steps: FunnelStepMetric[] = order.map((key, idx) => {
    const count = rawCounts[key];
    const prevKey = idx > 0 ? order[idx - 1] : null;
    const prevCount = prevKey ? rawCounts[prevKey] : null;
    const meta = STEP_META[key];
    return {
      key,
      label: meta.label,
      count,
      conversion_pct: prevCount !== null ? pct(count, prevCount) : null,
      drop_off_pct:
        prevCount !== null && prevCount > 0
          ? pct(prevCount - count, prevCount)
          : null,
      event_names: meta.events,
      missing_tracking: meta.missing,
      recommended_improvements: meta.improvements,
    };
  });

  return {
    range_days: rangeDays,
    cohort_signups: cohortSignups,
    steps,
    generated_at: new Date().toISOString(),
  };
}
