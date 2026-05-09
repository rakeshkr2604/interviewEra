/** Row from interviews + embedded reports (dashboard query). */
export type InterviewWithReportsRow = {
  id: string
  role: string
  difficulty: string
  status: string
  completed_at: string | null
  started_at: string | null
  reports: { overall_score: number | null; generated_at: string | null }[] | null
}

export type UserRow = {
  name: string | null
  plan_tier: string | null
  credits_remaining: number | null
  placement_date: string | null
  created_at: string | null
}
