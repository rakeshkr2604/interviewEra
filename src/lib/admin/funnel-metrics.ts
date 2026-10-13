/**
 * Founder funnel metrics — computed from transactional tables + product_events.
 *
 * Performance contract:
 * - Fetch the signup cohort once and reuse it across step helpers.
 * - Prefer bounded chunked `.in()` reads over per-user round-trips.
 * - Do not download full event histories when a distinct user_id set suffices.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { chunkIds } from '@/lib/dashboard/id-chunks';

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

export type FunnelCohortUser = {
  id: string;
  created_at: string;
};

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

const MS_DAY = 24 * 60 * 60 * 1000;

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function fetchFunnelCohort(
  svc: SupabaseClient,
  sinceIso: string,
): Promise<FunnelCohortUser[]> {
  const { data } = await svc
    .from('users')
    .select('id, created_at')
    .gte('created_at', sinceIso);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    created_at: r.created_at as string,
  }));
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

async function countCohortWithResume(
  svc: SupabaseClient,
  userIds: string[],
): Promise<number> {
  if (userIds.length === 0) return 0;
  const distinct = new Set<string>();
  for (const chunk of chunkIds(userIds)) {
    const { data } = await svc.from('resumes').select('user_id').in('user_id', chunk);
    for (const row of data ?? []) distinct.add(row.user_id as string);
  }
  return distinct.size;
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
  cohortIds?: string[],
): Promise<number> {
  const ids =
    cohortIds ??
    (await fetchFunnelCohort(svc, sinceIso)).map((u) => u.id);
  if (ids.length === 0) return 0;

  const distinct = new Set<string>();
  for (const chunk of chunkIds(ids)) {
    let query = svc.from('interviews').select('user_id').in('user_id', chunk);
    query = completed ? query.eq('status', 'completed') : query.neq('status', 'pending');
    const { data } = await query;
    for (const row of data ?? []) distinct.add(row.user_id as string);
  }
  return distinct.size;
}

async function loadCohortInterviewUserStatuses(
  svc: SupabaseClient,
  userIds: string[],
): Promise<{ started: Set<string>; completed: Set<string> }> {
  const started = new Set<string>();
  const completed = new Set<string>();
  if (userIds.length === 0) {
    return { started, completed };
  }

  for (const chunk of chunkIds(userIds)) {
    const { data } = await svc
      .from('interviews')
      .select('user_id, status')
      .in('user_id', chunk);
    for (const row of data ?? []) {
      const uid = row.user_id as string;
      const status = row.status as string;
      if (status !== 'pending') started.add(uid);
      if (status === 'completed') completed.add(uid);
    }
  }
  return { started, completed };
}

export async function countCohortReportViewed(
  svc: SupabaseClient,
  sinceIso: string,
  cohortIds?: string[],
): Promise<number> {
  const ids =
    cohortIds ??
    (await fetchFunnelCohort(svc, sinceIso)).map((u) => u.id);
  if (ids.length === 0) return 0;

  const eventUsers = new Set<string>();
  for (const chunk of chunkIds(ids)) {
    const { data: events } = await svc
      .from('product_events')
      .select('user_id')
      .in('user_id', chunk)
      .in('event_name', ['report_viewed', 'report_opened']);
    for (const row of events ?? []) {
      if (row.user_id) eventUsers.add(row.user_id as string);
    }
  }
  if (eventUsers.size > 0) return eventUsers.size;

  const completedInterviewIds: string[] = [];
  const interviewUserById = new Map<string, string>();
  for (const chunk of chunkIds(ids)) {
    const { data: interviews } = await svc
      .from('interviews')
      .select('id, user_id')
      .in('user_id', chunk)
      .eq('status', 'completed');
    for (const row of interviews ?? []) {
      const iid = row.id as string;
      completedInterviewIds.push(iid);
      interviewUserById.set(iid, row.user_id as string);
    }
  }
  if (completedInterviewIds.length === 0) return 0;

  const reportInterviewIds = new Set<string>();
  for (const chunk of chunkIds(completedInterviewIds)) {
    const { data: reports } = await svc
      .from('reports')
      .select('interview_id')
      .in('interview_id', chunk);
    for (const row of reports ?? []) {
      reportInterviewIds.add(row.interview_id as string);
    }
  }

  const users = new Set<string>();
  for (const interviewId of reportInterviewIds) {
    const uid = interviewUserById.get(interviewId);
    if (uid) users.add(uid);
  }
  return users.size;
}

export async function countCohortReturnVisit(
  svc: SupabaseClient,
  sinceIso: string,
  cohort?: FunnelCohortUser[],
): Promise<number> {
  const rows = cohort ?? (await fetchFunnelCohort(svc, sinceIso));
  if (rows.length === 0) return 0;

  const lastSeenByUser = new Map<string, number>();
  for (const chunk of chunkIds(rows.map((r) => r.id))) {
    const { data: activity } = await svc
      .from('user_activity')
      .select('user_id, last_seen_at')
      .in('user_id', chunk);
    for (const row of activity ?? []) {
      if (!row.last_seen_at) continue;
      lastSeenByUser.set(row.user_id as string, new Date(row.last_seen_at as string).getTime());
    }
  }

  let returned = 0;
  for (const row of rows) {
    const lastSeen = lastSeenByUser.get(row.id);
    if (lastSeen == null) continue;
    const d7 = new Date(row.created_at).getTime() + 7 * MS_DAY;
    if (lastSeen >= d7) returned += 1;
  }
  return returned;
}

async function countCohortPaid(svc: SupabaseClient, userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const distinct = new Set<string>();
  for (const chunk of chunkIds(userIds)) {
    const { data } = await svc
      .from('payments')
      .select('user_id')
      .in('user_id', chunk)
      .eq('status', 'paid');
    for (const row of data ?? []) distinct.add(row.user_id as string);
  }
  return distinct.size;
}

async function countVerificationCompleted(
  svc: SupabaseClient,
  sinceIso: string,
  cohortSize: number,
): Promise<number> {
  const eventCount = await countProductEventsSince(svc, ['verification_completed'], sinceIso);
  if (eventCount > 0) return eventCount;
  return cohortSize;
}

export async function computeFunnelMetrics(
  svc: SupabaseClient,
  rangeDays: number,
  options?: { sinceIso?: string },
): Promise<FunnelMetricsResult> {
  const since =
    options?.sinceIso ?? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  const cohort = await fetchFunnelCohort(svc, since);
  const cohortIds = cohort.map((u) => u.id);
  const cohortSignups = cohort.length;

  const [
    pageViews,
    landingCta,
    resumeUsers,
    interviewStatuses,
    reportUsers,
    returnUsers,
    paidUsers,
    verifiedUsers,
  ] = await Promise.all([
    countProductEventsSince(svc, ['page_view'], since),
    countProductEventsSince(svc, ['landing_cta_clicked'], since),
    countCohortWithResume(svc, cohortIds),
    loadCohortInterviewUserStatuses(svc, cohortIds),
    countCohortReportViewed(svc, since, cohortIds),
    countCohortReturnVisit(svc, since, cohort),
    countCohortPaid(svc, cohortIds),
    countVerificationCompleted(svc, since, cohortSignups),
  ]);

  const landingCount = Math.max(pageViews, landingCta, cohortSignups);
  const rawCounts: Record<FunnelStepKey, number> = {
    landing: landingCount,
    signup: cohortSignups,
    verification: Math.min(verifiedUsers, cohortSignups),
    resume: resumeUsers,
    interview_started: interviewStatuses.started.size,
    interview_completed: interviewStatuses.completed.size,
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
