import type { HiringStage } from './pipeline';

export interface HiringOrg {
  id: string;
  name: string;
  adminUserId: string;
}

export interface HiringCandidate {
  id: string;
  orgId: string;
  fullName: string;
  email: string | null;
  roleTitle: string | null;
  stage: HiringStage;
  score: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function mapCandidateRow(row: {
  id: string;
  org_id: string;
  full_name: string;
  email: string | null;
  role_title: string | null;
  stage: string;
  score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): HiringCandidate {
  return {
    id: row.id,
    orgId: row.org_id,
    fullName: row.full_name,
    email: row.email,
    roleTitle: row.role_title,
    stage: row.stage as HiringStage,
    score: row.score,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
