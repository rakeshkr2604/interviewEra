/** Lightweight row for progress-overview window stats (completed interviews only). */
export type ProgressInterviewRow = {
  id: string
  started_at: string | null
  completed_at: string | null
  engine: string | null
  reports: { id: string; overall_score: number | null; generated_at: string | null }[] | null
  /** Populated after wave2 join — null when no script reports exist. */
  script_interview_reports?: { overall: number | null; status: string; generated_at: string | null }[] | null
}

/** Row from interviews + embedded reports (dashboard query). */
export type InterviewWithReportsRow = {
  id: string
  role: string
  difficulty: string
  status: string
  completed_at: string | null
  started_at: string | null
  engine?: string | null
  credit_deducted?: boolean | null
  abandoned_resume_used?: boolean | null
  reports: { id: string; overall_score: number | null; generated_at: string | null }[] | null
  script_interview_reports?:
    | { id: string; overall: number | null; generated_at: string | null; status: string }[]
    | null
}

export type UserRow = {
  name: string | null
  plan_tier: string | null
  credits_remaining: number | null
  plan_expires_at: string | null
  plan_status: string | null
  placement_date: string | null
  created_at: string | null
  avatar_path?: string | null
}
