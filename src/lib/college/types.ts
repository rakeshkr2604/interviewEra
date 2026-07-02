export const INVITE_EXPIRY_DAYS = 7;

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type CampusRole = 'campus_admin' | 'placement_officer' | 'recruiter';

export type CampusPermission =
  | 'students:read'
  | 'students:write'
  | 'invites:manage'
  | 'analytics:read'
  | 'deadlines:manage'
  | 'settings:write';

export interface CampusOrg {
  id: string;
  name: string;
  seatCount: number;
  adminUserId: string;
}

export interface StudentWithProgress {
  id: string;
  name: string | null;
  email: string;
  branch: string | null;
  roll_number: string | null;
  year: number | null;
  enrollment_status: string;
  enrolled_at: string;
  total_sessions: number;
  avg_score: number | null;
  current_tier: number;
  placement_ready: boolean;
  resume_status: string | null;
}

export interface CampusInviteRow {
  id: string;
  email: string;
  token: string;
  status: InviteStatus;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string | null;
  effective_status: InviteStatus;
}

export interface ActivityEvent {
  id: string;
  type: 'enrollment' | 'interview' | 'invite' | 'deadline';
  title: string;
  description: string;
  occurred_at: string;
}

export interface BranchAnalytics {
  branch: string;
  studentCount: number;
  avgScore: number | null;
  placementReady: number;
}

export interface AnalyticsPayload {
  tierDistribution: { tier: number; count: number }[];
  scoreTrend: { date: string; score: number }[];
  sessionActivity: { date: string; count: number }[];
  placementReady: { ready: number; almostReady: number; needsWork: number };
  branchBreakdown: BranchAnalytics[];
  completionRate: number;
  totalStudents: number;
  generatedAt: string;
}
