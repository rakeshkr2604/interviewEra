/**
 * GET /api/admin/feedback
 *
 * Paginated, filtered, searched feedback list for the founder triage dashboard.
 * Returns items + global stats (unread/unresolved/critical counts) in one round-trip.
 *
 * Query params:
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
  // Triage columns (migration 031)
  is_read: boolean;
  is_resolved: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  notes: string | null;
  assigned_to: string | null;
  // Auto-generated labels (migration 032)
  labels: string[];
  // Public-display opt-in (migration 064) — false for all pre-consent rows
  consent_public_display: boolean;
  technical_failure_case?: TechnicalFailureCaseView | null;
}

export interface DashboardStats {
  total_unarchived: number;
  unread: number;
  unresolved: number;
  critical_and_high: number;
  failed_email_count: number;
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
  const feedbackIds = rows.map((row) => row.id);
  if (feedbackIds.length === 0) return rows;

  const { data: cases, error } = await service
    .from('technical_failure_cases')
    .select(
      'id, user_id, interview_id, feedback_id, failure_category, status, original_debit_transaction_id, restoration_transaction_id, service_recovery_transaction_id, submitted_at, review_started_at, resolved_at, restored_at, service_recovery_granted_at, reviewed_by_email, decision_reason, service_recovery_reason',
    )
    .in('feedback_id', feedbackIds);

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

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);

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
  const [totalRes, unreadRes, unresolvedRes, criticalRes, failedEmailRes] = await Promise.all([
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false).eq('is_read', false),
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false).eq('is_resolved', false),
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_archived', false).in('severity', ['critical', 'high']),
    service.from('feedbacks').select('*', { count: 'exact', head: true }).eq('email_status', 'failed'),
  ]);

  const stats: DashboardStats = {
    total_unarchived:  totalRes.count    ?? 0,
    unread:            unreadRes.count   ?? 0,
    unresolved:        unresolvedRes.count ?? 0,
    critical_and_high: criticalRes.count ?? 0,
    failed_email_count: failedEmailRes.count ?? 0,
  };

  // ── Build paginated list query ─────────────────────────────────────────────
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

  // Sort order: pinned items always first, then secondary sort
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
    // Severity sort: fetch all matching rows (up to 200) and sort client-side
    // since PostgREST can't CASE WHEN through the JS SDK.
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
      total_pages: Math.ceil(sorted.length / limit),
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

  const items = await attachTechnicalFailureCases(service, (data ?? []) as FeedbackRow[]);

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
    stats,
  } satisfies FeedbackListResponse);
}
