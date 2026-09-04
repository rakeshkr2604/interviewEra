/**
 * GET /api/admin/feedback
 *
 * Paginated, filtered, searched feedback list for the founder triage dashboard.
 * Supports General Platform Feedback, After-Interview Session Feedback, and Interview Exit Feedback.
 * Returns items + global stats (unread/unresolved/critical counts) in one round-trip.
 *
 * Query params:
 *   source      ('all' | 'platform' | 'interview' | 'exit', default 'all')
 *   page        (int, default 1)
 *   limit       (int, default 20, max 50)
 *   q           (search: email | name | liked_text | confusion_text | bugs_text)
 *   severity    ('critical' | 'high' | 'medium' | 'low' | '')
 *   rating      (1–5 half-star steps, e.g. 3.5 | '')
 *   is_read     ('true' | 'false' | '')
 *   is_resolved ('true' | 'false' | '')
 *   is_pinned   ('true' | '')
 *   show_archived ('true' | '', default hidden)
 *   date_from   (ISO date string)
 *   date_to     (ISO date string)
 *   label       (one of the FeedbackLabel values, e.g. 'Mobile')
 *   email_status ('pending' | 'sent' | 'failed' | 'retrying' | '')
 *   consent_public ('true' | '' — when true, only rows with consent_public_display)
 *   sort        ('newest' | 'oldest' | 'rating_asc' | 'rating_desc' | 'severity', default 'newest')
 *
 * Secured: platform admin only (ADMIN_EMAILS env var).
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import type { TechnicalFailureCaseView } from '@/lib/technical-failures/types';

export const runtime = 'nodejs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterviewFeedbackContext {
  interview_id: string;
  role: string | null;
  difficulty: string | null;
  engine: string | null;
  status: string | null;
  completed_at: string | null;
  report_id: string | null;
  exit_reason?: string | null;
  issue_type?: string | null;
  question_index?: number | null;
  progress_percent?: number | null;
}

export interface FeedbackRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  rating: number | null;
  liked_text: string;
  confusion_text: string;
  bugs_text: string;
  would_use_again: boolean | null;
  page_url: string;
  browser_info: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | null;
  screenshot_url: string | null;
  session_context: Record<string, unknown> | null;
  email_status: string;
  created_at: string;
  // Triage columns
  is_read: boolean;
  is_resolved: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  notes: string | null;
  assigned_to: string | null;
  // Auto-generated labels
  labels: string[];
  // Public-display opt-in
  consent_public_display: boolean;
  technical_failure_case?: TechnicalFailureCaseView | null;
  // Distinguish after-interview feedback and exit feedback from general platform feedback
  feedback_source?: 'platform' | 'interview' | 'exit';
  interview_context?: InterviewFeedbackContext | null;
}

export interface DashboardStats {
  total_unarchived: number;
  unread: number;
  unresolved: number;
  critical_and_high: number;
  failed_email_count: number;
  total_interview_feedback?: number;
  total_exit_feedback?: number;
}

export interface FeedbackListResponse {
  items: FeedbackRow[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  stats: DashboardStats;
}

// ─── Severity sort order ──────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
};

function bySeverity(a: FeedbackRow, b: FeedbackRow): number {
  const ao = SEVERITY_ORDER[a.severity ?? ''] ?? 4;
  const bo = SEVERITY_ORDER[b.severity ?? ''] ?? 4;
  if (ao !== bo) return ao - bo;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

async function attachTechnicalFailureCases(
  service: ReturnType<typeof createServiceClient>,
  rows: FeedbackRow[],
): Promise<FeedbackRow[]> {
  const platformFeedbackIds = rows
    .filter((row) => row.feedback_source === 'platform')
    .map((row) => row.id);

  if (platformFeedbackIds.length === 0) return rows;

  const { data: cases, error } = await service
    .from('technical_failure_cases')
    .select(
      'id, user_id, interview_id, feedback_id, failure_category, status, original_debit_transaction_id, restoration_transaction_id, service_recovery_transaction_id, submitted_at, review_started_at, resolved_at, restored_at, service_recovery_granted_at, reviewed_by_email, decision_reason, service_recovery_reason',
    )
    .in('feedback_id', platformFeedbackIds);

  if (error || !cases?.length) {
    if (error) console.error('[admin/feedback] technical case query failed:', error.message);
    return rows;
  }

  const interviewIds = cases.map((item) => item.interview_id as string);
  const debitIds = cases
    .map((item) => item.original_debit_transaction_id as string | null)
    .filter((id): id is string => Boolean(id));

  const [{ data: interviews }, { data: debits }] = await Promise.all([
    service
      .from('interviews')
      .select('id, role, difficulty, status, engine, started_at, completed_at, credit_deducted')
      .in('id', interviewIds),
    debitIds.length > 0
      ? service
          .from('credit_transactions')
          .select('id, amount, reason, created_at')
          .in('id', debitIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const interviewById = new Map((interviews ?? []).map((item) => [item.id as string, item]));
  const debitById = new Map((debits ?? []).map((item) => [item.id as string, item]));
  const caseByFeedbackId = new Map(
    cases.map((item) => {
      const interview = interviewById.get(item.interview_id as string) ?? null;
      const debitId = item.original_debit_transaction_id as string | null;
      const debit = debitId ? debitById.get(debitId) ?? null : null;
      return [
        item.feedback_id as string,
        {
          ...item,
          interview,
          original_debit: debit,
        } as unknown as TechnicalFailureCaseView,
      ];
    }),
  );

  return rows.map((row) => ({
    ...row,
    technical_failure_case: caseByFeedbackId.get(row.id) ?? null,
  }));
}

/**
 * Fetch and transform interview_feedbacks rows with user and interview joins.
 */
async function fetchInterviewFeedbacks(
  service: ReturnType<typeof createServiceClient>,
  filters: {
    showArchived: boolean;
    severity: string;
    ratingParam: string;
    isReadParam: string;
    isResolvedParam: string;
    isPinnedParam: string;
    dateFrom: string;
    dateTo: string;
    q: string;
  },
): Promise<FeedbackRow[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = service.from('interview_feedbacks').select(`
      id, user_id, interview_id, rating, liked_aspect, issue_type, comment,
      device_info, is_read, is_resolved, is_archived, is_pinned, notes,
      submitted_at, created_at, updated_at
    `);

    if (!filters.showArchived) {
      q = q.eq('is_archived', false);
    } else {
      q = q.eq('is_archived', true);
    }

    if (filters.ratingParam) {
      const rating = Number(filters.ratingParam);
      if (Number.isFinite(rating)) q = q.eq('rating', rating);
    }
    if (filters.isReadParam !== '')     q = q.eq('is_read', filters.isReadParam === 'true');
    if (filters.isResolvedParam !== '') q = q.eq('is_resolved', filters.isResolvedParam === 'true');
    if (filters.isPinnedParam === 'true') q = q.eq('is_pinned', true);
    if (filters.dateFrom)               q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo)                 q = q.lte('created_at', filters.dateTo + 'T23:59:59Z');

    if (filters.q) {
      const escaped = filters.q.replace(/[%_]/g, '\\$&');
      q = q.or(
        `liked_aspect.ilike.%${escaped}%,` +
        `issue_type.ilike.%${escaped}%,` +
        `comment.ilike.%${escaped}%`,
      );
    }

    const { data: rawRows, error } = await q.order('created_at', { ascending: false }).limit(200);

    if (error || !rawRows) {
      console.error('[admin/feedback] interview_feedbacks query error:', error?.message);
      return [];
    }

    if (rawRows.length === 0) return [];

    const userIds = Array.from(
      new Set(rawRows.map((r: { user_id: string | null }) => r.user_id).filter(Boolean)),
    ) as string[];
    const interviewIds = Array.from(
      new Set(rawRows.map((r: { interview_id: string }) => r.interview_id).filter(Boolean)),
    ) as string[];

    const [{ data: users }, { data: interviews }, { data: reports }] = await Promise.all([
      userIds.length > 0
        ? service.from('users').select('id, name, email').in('id', userIds)
        : Promise.resolve({ data: [] }),
      interviewIds.length > 0
        ? service
            .from('interviews')
            .select('id, role, difficulty, engine, status, completed_at')
            .in('id', interviewIds)
        : Promise.resolve({ data: [] }),
      interviewIds.length > 0
        ? service.from('reports').select('id, interview_id').in('interview_id', interviewIds)
        : Promise.resolve({ data: [] }),
    ]);

    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));
    const interviewMap = new Map((interviews ?? []).map((i) => [i.id as string, i]));
    const reportMap = new Map((reports ?? []).map((r) => [r.interview_id as string, r.id as string]));

    return rawRows.map((r: {
      id: string;
      user_id: string | null;
      interview_id: string;
      rating: number;
      liked_aspect: string;
      issue_type: string;
      comment: string;
      device_info: Record<string, unknown> | null;
      is_read: boolean;
      is_resolved: boolean;
      is_archived: boolean;
      is_pinned: boolean;
      notes: string | null;
      created_at: string;
    }) => {
      const user = r.user_id ? userMap.get(r.user_id) : null;
      const interview = interviewMap.get(r.interview_id);
      const reportId = reportMap.get(r.interview_id) ?? null;

      // Auto-derive labels
      const labels: string[] = ['Interview Feedback'];
      if (r.issue_type && r.issue_type !== 'No issues') {
        labels.push(r.issue_type);
      }

      // Compute severity for interview feedback: 1-2 stars or serious technical error = high/critical
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (r.rating <= 1 || r.issue_type === 'Interview froze/stuck') {
        severity = 'critical';
      } else if (r.rating === 2 || r.issue_type === 'Technical error' || r.issue_type === 'Mic/audio issue') {
        severity = 'high';
      } else if (r.rating === 3 || (r.issue_type && r.issue_type !== 'No issues')) {
        severity = 'medium';
      }

      const row: FeedbackRow = {
        id: r.id,
        user_id: r.user_id,
        name: user?.name || 'Candidate',
        email: user?.email || '',
        rating: r.rating,
        liked_text: r.liked_aspect ? `What worked: ${r.liked_aspect}` : '',
        confusion_text: r.comment || '',
        bugs_text: r.issue_type && r.issue_type !== 'No issues' ? `Issue: ${r.issue_type}` : '',
        would_use_again: null,
        page_url: `/interview/${r.interview_id}`,
        browser_info: r.device_info ? JSON.stringify(r.device_info) : '',
        severity,
        screenshot_url: null,
        session_context: (r.device_info as Record<string, unknown>) ?? null,
        email_status: 'sent',
        created_at: r.created_at,
        is_read: r.is_read,
        is_resolved: r.is_resolved,
        is_archived: r.is_archived,
        is_pinned: r.is_pinned,
        notes: r.notes,
        assigned_to: null,
        labels,
        consent_public_display: false,
        feedback_source: 'interview',
        interview_context: {
          interview_id: r.interview_id,
          role: (interview?.role as string | null) ?? null,
          difficulty: (interview?.difficulty as string | null) ?? null,
          engine: (interview?.engine as string | null) ?? null,
          status: (interview?.status as string | null) ?? null,
          completed_at: (interview?.completed_at as string | null) ?? null,
          report_id: reportId,
        },
      };

      return row;
    });
  } catch (err) {
    console.error('[admin/feedback] fetchInterviewFeedbacks unexpected:', err);
    return [];
  }
}

/**
 * Fetch and transform interview_exit_feedbacks rows with user and interview joins.
 */
async function fetchInterviewExitFeedbacks(
  service: ReturnType<typeof createServiceClient>,
  filters: {
    showArchived: boolean;
    severity: string;
    isReadParam: string;
    isResolvedParam: string;
    isPinnedParam: string;
    dateFrom: string;
    dateTo: string;
    q: string;
  },
): Promise<FeedbackRow[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = service.from('interview_exit_feedbacks').select(`
      id, user_id, interview_id, exit_reason, issue_type, comment,
      question_index, progress_percent, engine,
      device_info, is_read, is_resolved, is_archived, is_pinned, notes,
      submitted_at, created_at, updated_at
    `);

    if (!filters.showArchived) {
      q = q.eq('is_archived', false);
    } else {
      q = q.eq('is_archived', true);
    }

    if (filters.isReadParam !== '')     q = q.eq('is_read', filters.isReadParam === 'true');
    if (filters.isResolvedParam !== '') q = q.eq('is_resolved', filters.isResolvedParam === 'true');
    if (filters.isPinnedParam === 'true') q = q.eq('is_pinned', true);
    if (filters.dateFrom)               q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo)                 q = q.lte('created_at', filters.dateTo + 'T23:59:59Z');

    if (filters.q) {
      const escaped = filters.q.replace(/[%_]/g, '\\$&');
      q = q.or(
        `exit_reason.ilike.%${escaped}%,` +
        `issue_type.ilike.%${escaped}%,` +
        `comment.ilike.%${escaped}%`,
      );
    }

    const { data: rawRows, error } = await q.order('created_at', { ascending: false }).limit(200);

    if (error || !rawRows) {
      console.error('[admin/feedback] interview_exit_feedbacks query error:', error?.message);
      return [];
    }

    if (rawRows.length === 0) return [];

    const userIds = Array.from(
      new Set(rawRows.map((r: { user_id: string | null }) => r.user_id).filter(Boolean)),
    ) as string[];
    const interviewIds = Array.from(
      new Set(rawRows.map((r: { interview_id: string }) => r.interview_id).filter(Boolean)),
    ) as string[];

    const [{ data: users }, { data: interviews }, { data: reports }] = await Promise.all([
      userIds.length > 0
        ? service.from('users').select('id, name, email').in('id', userIds)
        : Promise.resolve({ data: [] }),
      interviewIds.length > 0
        ? service
            .from('interviews')
            .select('id, role, difficulty, engine, status, completed_at')
            .in('id', interviewIds)
        : Promise.resolve({ data: [] }),
      interviewIds.length > 0
        ? service.from('reports').select('id, interview_id').in('interview_id', interviewIds)
        : Promise.resolve({ data: [] }),
    ]);

    const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));
    const interviewMap = new Map((interviews ?? []).map((i) => [i.id as string, i]));
    const reportMap = new Map((reports ?? []).map((r) => [r.interview_id as string, r.id as string]));

    return rawRows.map((r: {
      id: string;
      user_id: string | null;
      interview_id: string;
      exit_reason: string;
      issue_type: string;
      comment: string;
      question_index: number | null;
      progress_percent: number | null;
      engine: string;
      device_info: Record<string, unknown> | null;
      is_read: boolean;
      is_resolved: boolean;
      is_archived: boolean;
      is_pinned: boolean;
      notes: string | null;
      created_at: string;
    }) => {
      const user = r.user_id ? userMap.get(r.user_id) : null;
      const interview = interviewMap.get(r.interview_id);
      const reportId = reportMap.get(r.interview_id) ?? null;

      // Auto-derive labels
      const labels: string[] = ['Exit Feedback'];
      if (r.exit_reason) {
        labels.push(r.exit_reason);
      }
      if (r.issue_type) {
        labels.push(r.issue_type);
      }

      // Compute severity
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (
        r.exit_reason === 'I ran into a technical problem' ||
        r.issue_type === 'Interview froze/stuck' ||
        r.issue_type === "Page didn't load/work correctly"
      ) {
        severity = 'critical';
      } else if (
        r.exit_reason === "The interview wasn't working as expected" ||
        r.issue_type === 'Mic/audio problem' ||
        r.issue_type === 'Network problem'
      ) {
        severity = 'high';
      } else if (
        r.exit_reason === "I wasn't satisfied with the experience" ||
        r.exit_reason === 'The questions were too difficult' ||
        r.exit_reason === "The questions weren't relevant to me"
      ) {
        severity = 'medium';
      }

      const row: FeedbackRow = {
        id: r.id,
        user_id: r.user_id,
        name: user?.name || 'Candidate',
        email: user?.email || '',
        rating: null,
        liked_text: '',
        confusion_text: r.comment || '',
        bugs_text: r.issue_type
          ? `Issue: ${r.issue_type}`
          : r.exit_reason
            ? `Reason: ${r.exit_reason}`
            : '',
        would_use_again: null,
        page_url: `/interview/${r.interview_id}`,
        browser_info: r.device_info ? JSON.stringify(r.device_info) : '',
        severity,
        screenshot_url: null,
        session_context: (r.device_info as Record<string, unknown>) ?? null,
        email_status: 'sent',
        created_at: r.created_at,
        is_read: r.is_read,
        is_resolved: r.is_resolved,
        is_archived: r.is_archived,
        is_pinned: r.is_pinned,
        notes: r.notes,
        assigned_to: null,
        labels,
        consent_public_display: false,
        feedback_source: 'exit',
        interview_context: {
          interview_id: r.interview_id,
          role: (interview?.role as string | null) ?? null,
          difficulty: (interview?.difficulty as string | null) ?? null,
          engine: r.engine || ((interview?.engine as string | null) ?? null),
          status: (interview?.status as string | null) ?? null,
          completed_at: (interview?.completed_at as string | null) ?? null,
          report_id: reportId,
          exit_reason: r.exit_reason,
          issue_type: r.issue_type || null,
          question_index: r.question_index,
          progress_percent: r.progress_percent,
        },
      };

      return row;
    });
  } catch (err) {
    console.error('[admin/feedback] fetchInterviewExitFeedbacks unexpected:', err);
    return [];
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);

  const source        = searchParams.get('source') ?? 'all'; // 'all' | 'platform' | 'interview' | 'exit'
  const page          = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit         = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
  const q             = (searchParams.get('q') ?? '').trim();
  const severity      = searchParams.get('severity') ?? '';
  const ratingParam   = searchParams.get('rating') ?? '';
  const isReadParam   = searchParams.get('is_read') ?? '';
  const isResolvedParam = searchParams.get('is_resolved') ?? '';
  const isPinnedParam = searchParams.get('is_pinned') ?? '';
  const showArchived  = searchParams.get('show_archived') === 'true';
  const dateFrom      = searchParams.get('date_from') ?? '';
  const dateTo        = searchParams.get('date_to') ?? '';
  const labelFilter   = searchParams.get('label') ?? '';
  const emailStatus   = searchParams.get('email_status') ?? '';
  const consentPublic = searchParams.get('consent_public') ?? '';
  const sort          = searchParams.get('sort') ?? 'newest';

  const service = createServiceClient();

  // ── Stats (global, unaffected by current filters) ─────────────────────────
  const [
    totalRes,
    unreadRes,
    unresolvedRes,
    criticalRes,
    failedEmailRes,
    interviewFeedbackCountRes,
    exitFeedbackCountRes,
  ] = await Promise.all([
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false).eq('is_read', false),
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false).eq('is_resolved', false),
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false).in('severity', ['critical', 'high']),
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('email_status', 'failed'),
    service.from('interview_feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    service.from('interview_exit_feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false),
  ]);

  const interviewUnarchived = interviewFeedbackCountRes.count ?? 0;
  const exitUnarchived = exitFeedbackCountRes.count ?? 0;
  const stats: DashboardStats = {
    total_unarchived:  (totalRes.count ?? 0) + interviewUnarchived + exitUnarchived,
    unread:            unreadRes.count   ?? 0,
    unresolved:        unresolvedRes.count ?? 0,
    critical_and_high: criticalRes.count ?? 0,
    failed_email_count: failedEmailRes.count ?? 0,
    total_interview_feedback: interviewUnarchived,
    total_exit_feedback: exitUnarchived,
  };

  // If source is strictly 'interview', query interview_feedbacks only
  if (source === 'interview') {
    const interviewRows = await fetchInterviewFeedbacks(service, {
      showArchived,
      severity,
      ratingParam,
      isReadParam,
      isResolvedParam,
      isPinnedParam,
      dateFrom,
      dateTo,
      q,
    });

    const sorted = [...interviewRows];
    if (sort === 'severity') {
      sorted.sort(bySeverity);
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sort === 'rating_asc') {
      sorted.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    } else if (sort === 'rating_desc') {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      // newest + pinned first
      sorted.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    const total = sorted.length;
    const sliced = sorted.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      items: sliced,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
      stats,
    } satisfies FeedbackListResponse);
  }

  // If source is strictly 'exit', query interview_exit_feedbacks only
  if (source === 'exit') {
    const exitRows = await fetchInterviewExitFeedbacks(service, {
      showArchived,
      severity,
      isReadParam,
      isResolvedParam,
      isPinnedParam,
      dateFrom,
      dateTo,
      q,
    });

    const sorted = [...exitRows];
    if (sort === 'severity') {
      sorted.sort(bySeverity);
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      // newest + pinned first
      sorted.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    const total = sorted.length;
    const sliced = sorted.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      items: sliced,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
      stats,
    } satisfies FeedbackListResponse);
  }

  // ── Build paginated list query for feedbacks ─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (service.from('feedbacks').select('*', { count: 'exact' }) as any);

  // Archive visibility: default hides archived
  if (!showArchived) {
    query = query.eq('is_archived', false);
  } else {
    query = query.eq('is_archived', true);
  }

  // Filters
  if (severity)               query = query.eq('severity', severity);
  if (ratingParam) {
    const ratingFilter = Number(ratingParam);
    if (Number.isFinite(ratingFilter)) query = query.eq('rating', ratingFilter);
  }
  if (isReadParam !== '')     query = query.eq('is_read',     isReadParam === 'true');
  if (isResolvedParam !== '') query = query.eq('is_resolved', isResolvedParam === 'true');
  if (isPinnedParam === 'true') query = query.eq('is_pinned', true);
  if (dateFrom)               query = query.gte('created_at', dateFrom);
  if (dateTo)                 query = query.lte('created_at', dateTo + 'T23:59:59Z');
  if (labelFilter)            query = query.contains('labels', [labelFilter]);
  if (emailStatus)            query = query.eq('email_status', emailStatus);
  if (consentPublic === 'true') query = query.eq('consent_public_display', true);

  // Full-text search across multiple text columns
  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&');
    query = query.or(
      `email.ilike.%${escaped}%,` +
      `name.ilike.%${escaped}%,` +
      `liked_text.ilike.%${escaped}%,` +
      `confusion_text.ilike.%${escaped}%,` +
      `bugs_text.ilike.%${escaped}%`,
    );
  }

  // If source === 'all', also fetch interview feedback and exit feedback and combine
  if (source === 'all') {
    const [platformResult, interviewRows, exitRows] = await Promise.all([
      query.order('created_at', { ascending: false }).limit(200),
      fetchInterviewFeedbacks(service, {
        showArchived,
        severity,
        ratingParam,
        isReadParam,
        isResolvedParam,
        isPinnedParam,
        dateFrom,
        dateTo,
        q,
      }),
      fetchInterviewExitFeedbacks(service, {
        showArchived,
        severity,
        isReadParam,
        isResolvedParam,
        isPinnedParam,
        dateFrom,
        dateTo,
        q,
      }),
    ]);

    const platformRows = ((platformResult.data ?? []) as FeedbackRow[]).map((r) => ({
      ...r,
      feedback_source: 'platform' as const,
    }));

    const combined = [...platformRows, ...interviewRows, ...exitRows];

    if (sort === 'severity') {
      combined.sort(bySeverity);
    } else if (sort === 'oldest') {
      combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sort === 'rating_asc') {
      combined.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    } else if (sort === 'rating_desc') {
      combined.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      // newest + pinned first
      combined.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    const total = combined.length;
    const sliced = combined.slice((page - 1) * limit, page * limit);
    const items = await attachTechnicalFailureCases(service, sliced);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
      stats,
    } satisfies FeedbackListResponse);
  }

  // Sort order for platform feedback: pinned items always first, then secondary sort
  query = query.order('is_pinned', { ascending: false });

  if (sort !== 'severity') {
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'rating_asc':
        query = query.order('rating', { ascending: true }).order('created_at', { ascending: false });
        break;
      case 'rating_desc':
        query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
        break;
      default: // 'newest'
        query = query.order('created_at', { ascending: false });
    }
  } else {
    query = query.order('created_at', { ascending: false }).limit(200);
    const { data: allRows, error: fetchErr } = await query;
    if (fetchErr) {
      console.error('[admin/feedback] List query error:', fetchErr.message);
      return NextResponse.json({ error: 'Failed to load feedback.' }, { status: 500 });
    }
    const sorted = [...((allRows ?? []) as FeedbackRow[])].sort(bySeverity);
    const sliced = sorted.slice((page - 1) * limit, (page - 1) * limit + limit);
    const enriched = await attachTechnicalFailureCases(service, sliced);
    return NextResponse.json({
      items: enriched,
      total: sorted.length,
      page,
      limit,
      total_pages: Math.ceil(sorted.length / limit) || 1,
      stats,
    } satisfies FeedbackListResponse);
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error: fetchError } = await query;

  if (fetchError) {
    console.error('[admin/feedback] List query error:', fetchError.message);
    return NextResponse.json({ error: 'Failed to load feedback.' }, { status: 500 });
  }

  const total = count ?? 0;
  const items = await attachTechnicalFailureCases(
    service,
    ((data ?? []) as FeedbackRow[]).map((r) => ({ ...r, feedback_source: 'platform' })),
  );

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit) || 1,
    stats,
  } satisfies FeedbackListResponse);
}
