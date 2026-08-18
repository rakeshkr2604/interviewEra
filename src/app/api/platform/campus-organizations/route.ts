import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  campusApprovalStatusSchema,
  deriveOrganizationDomain,
  isCampusReviewSchemaUnavailable,
  type CampusApprovalListResponse,
  type CampusApprovalRow,
} from '@/lib/admin/campus-approvals';
import { createServiceClient } from '@/lib/supabase/server';

const querySchema = z.object({
  status: campusApprovalStatusSchema.default('pending'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(25).default(10),
  search: z.string().trim().max(100).default(''),
});

type OrgRow = {
  id: string;
  name: string;
  admin_user_id: string | null;
  seat_count: number;
  created_at: string;
  contact_email: string | null;
  coordinator_name: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
};

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
    pageSize: url.searchParams.get('pageSize') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters.' }, { status: 400 });
  }

  const { status, page, pageSize, search } = parsed.data;
  const service = createServiceClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const countFor = async (filter?: Exclude<typeof status, 'all'>) => {
      let countQuery = service
        .from('campus_organizations')
        .select('id', { count: 'exact', head: true });
      if (filter) countQuery = countQuery.eq('verification_status', filter);
      const { count, error } = await countQuery;
      if (error) throw error;
      return count ?? 0;
    };

    const [allCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      countFor(),
      countFor('pending'),
      countFor('approved'),
      countFor('rejected'),
    ]);

    let orgQuery = service
      .from('campus_organizations')
      .select(
        'id, name, admin_user_id, seat_count, created_at, contact_email, coordinator_name, verification_status',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false });

    if (status !== 'all') orgQuery = orgQuery.eq('verification_status', status);
    const safeSearch = search.replace(/[^\p{L}\p{N}@._ -]/gu, ' ').trim();
    if (safeSearch) {
      const pattern = `%${safeSearch}%`;
      orgQuery = orgQuery.or(
        `name.ilike.${pattern},contact_email.ilike.${pattern},coordinator_name.ilike.${pattern}`,
      );
    }

    const { data: orgData, count: filteredCount, error: orgError } = await orgQuery.range(from, to);
    if (orgError) throw orgError;
    const organizations = (orgData ?? []) as OrgRow[];
    const orgIds = organizations.map((org) => org.id);
    const adminIds = organizations
      .map((org) => org.admin_user_id)
      .filter((id): id is string => Boolean(id));

    const [adminResult, memberResults, reviewResult] = await Promise.all([
      adminIds.length
        ? service
            .from('users')
            .select('id, name, email, plan_tier, created_at')
            .in('id', adminIds)
        : Promise.resolve({ data: [], error: null }),
      Promise.all(
        orgIds.map(async (organizationId) => {
          const { count, error } = await service
            .from('college_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('college_id', organizationId);
          return { organizationId, count: count ?? 0, error };
        }),
      ),
      orgIds.length
        ? service
            .from('campus_organization_review_events')
            .select('organization_id, action, reason, created_at, actor_user_id')
            .in('organization_id', orgIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (adminResult.error) throw adminResult.error;
    const memberCountError = memberResults.find((result) => result.error)?.error;
    if (memberCountError) throw memberCountError;
    const reviewSchemaUnavailable = isCampusReviewSchemaUnavailable(reviewResult.error?.code);
    if (reviewResult.error && !reviewSchemaUnavailable) throw reviewResult.error;
    if (reviewSchemaUnavailable) {
      console.warn('[platform:campus-approvals:list] Review schema unavailable', {
        code: reviewResult.error?.code,
      });
    }

    const admins = new Map(
      (adminResult.data ?? []).map((admin) => [admin.id, admin]),
    );
    const memberCounts = new Map(
      memberResults.map((result) => [result.organizationId, result.count]),
    );
    const latestReviews = new Map<string, NonNullable<CampusApprovalRow['latestReview']>>();
    for (const row of reviewResult.data ?? []) {
      if (latestReviews.has(row.organization_id)) continue;
      latestReviews.set(row.organization_id, {
        action: row.action as 'approved' | 'rejected',
        reason: row.reason,
        createdAt: row.created_at,
        actorUserId: row.actor_user_id,
      });
    }

    const rows: CampusApprovalRow[] = organizations.map((org) => {
      const admin = org.admin_user_id ? admins.get(org.admin_user_id) : null;
      return {
        id: org.id,
        name: org.name,
        verificationStatus: org.verification_status,
        createdAt: org.created_at,
        seatCount: org.seat_count,
        contactEmail: org.contact_email,
        coordinatorName: org.coordinator_name,
        domain: deriveOrganizationDomain(org.contact_email, admin?.email),
        admin: admin
          ? {
              id: admin.id,
              name: admin.name,
              email: admin.email,
              planTier: admin.plan_tier,
              createdAt: admin.created_at,
            }
          : null,
        memberCount: memberCounts.get(org.id) ?? 0,
        latestReview: latestReviews.get(org.id) ?? null,
      };
    });

    const total = filteredCount ?? 0;
    const response: CampusApprovalListResponse = {
      organizations: rows,
      counts: {
        all: allCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      capabilities: {
        reviewActions: !reviewSchemaUnavailable,
      },
      warning: reviewSchemaUnavailable
        ? 'Approval actions are unavailable because the campus review migration is not installed on this database.'
        : null,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[platform:campus-approvals:list]', error);
    return NextResponse.json({ error: 'Failed to load campus organizations.' }, { status: 500 });
  }
}
