import { z } from 'zod';

export const campusApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'all']);
export type CampusApprovalStatus = z.infer<typeof campusApprovalStatusSchema>;

export const campusReviewDecisionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approved'),
  }),
  z.object({
    action: z.literal('rejected'),
    reason: z.string().trim().min(3).max(500).regex(/^[^<>]*$/, 'Reason must be plain text.'),
  }),
]);

export type CampusReviewDecision = z.infer<typeof campusReviewDecisionSchema>;

export interface CampusApprovalRow {
  id: string;
  name: string;
  verificationStatus: Exclude<CampusApprovalStatus, 'all'>;
  createdAt: string;
  seatCount: number;
  contactEmail: string | null;
  coordinatorName: string | null;
  domain: string | null;
  admin: {
    id: string;
    name: string | null;
    email: string;
    planTier: string;
    createdAt: string;
  } | null;
  memberCount: number;
  latestReview: {
    action: 'approved' | 'rejected';
    reason: string | null;
    createdAt: string;
    actorUserId: string;
  } | null;
}

export interface CampusApprovalListResponse {
  organizations: CampusApprovalRow[];
  counts: Record<CampusApprovalStatus, number>;
  capabilities: {
    reviewActions: boolean;
  };
  warning: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function deriveOrganizationDomain(
  contactEmail: string | null | undefined,
  adminEmail: string | null | undefined,
): string | null {
  const email = contactEmail || adminEmail;
  if (!email) return null;
  const at = email.lastIndexOf('@');
  return at > 0 && at < email.length - 1 ? email.slice(at + 1).toLowerCase() : null;
}

export function isCampusReviewSchemaUnavailable(code: string | undefined): boolean {
  return code === 'PGRST202' || code === 'PGRST205' || code === '42P01';
}

export function campusReviewErrorStatus(
  message: string | undefined,
  code?: string,
): number {
  if (isCampusReviewSchemaUnavailable(code)) return 503;
  if (message?.includes('campus_organization_not_pending')) return 409;
  if (
    message?.includes('campus_organization_not_found')
    || message?.includes('campus_organization_admin_profile_not_found')
  ) {
    return 404;
  }
  if (
    message?.includes('invalid_campus_review_action')
    || message?.includes('campus_rejection_reason_required')
  ) {
    return 400;
  }
  return 500;
}
