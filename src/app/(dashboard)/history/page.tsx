import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { privatePageMetadata } from '@/lib/seo/metadata'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { HistoryListClient } from './HistoryListClient'

export const metadata = privatePageMetadata({
  title: 'History',
  description: 'Your completed and in-progress AI mock interviews.',
  path: '/history',
})

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: interviews } = await supabase
    .from('interviews')
    .select('id, role, difficulty, status, started_at, completed_at, question_count, engine, credit_deducted, abandoned_resume_used')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  const interviewIds = (interviews || []).map((i) => i.id as string)

  let v1Reports: { id: string; interview_id: string; overall_score: number | null }[] = []
  let v21Reports: {
    id: string
    interview_id: string
    overall: number | null
    status: string
  }[] = []

  if (interviewIds.length > 0) {
    const [v1Res, v21Res] = await Promise.all([
      supabase.from('reports').select('id, interview_id, overall_score').in('interview_id', interviewIds),
      supabase
        .from('script_interview_reports')
        .select('id, interview_id, overall, status')
        .in('interview_id', interviewIds),
    ])
    v1Reports = v1Res.data ?? []
    v21Reports = v21Res.data ?? []
  }

  const reportByInterviewId = new Map(v1Reports.map((r) => [r.interview_id, r]))
  const scriptReportByInterviewId = new Map(v21Reports.map((r) => [r.interview_id, r]))

  const sortedInterviews = [...(interviews || [])].sort((a, b) => {
    const aIso = (a.started_at as string | null) ?? (a.completed_at as string | null) ?? ''
    const bIso = (b.started_at as string | null) ?? (b.completed_at as string | null) ?? ''
    return bIso.localeCompare(aIso)
  })

  const items = sortedInterviews.map((interview) => {
    const engine = (interview.engine as string | null) ?? null
    const isScript = engine === 'v2.1'
    const v1 = reportByInterviewId.get(interview.id as string)
    const v21 = scriptReportByInterviewId.get(interview.id as string)
    const scriptReady =
      Boolean(v21) &&
      (v21!.status === 'ready' || v21!.status === 'partial') &&
      v21!.overall != null

    const score = isScript
      ? scriptReady
        ? Number(v21!.overall)
        : null
      : (v1?.overall_score ?? null)

    const reportHref =
      interview.status === 'completed'
        ? isScript
          ? `/report/script/${interview.id}`
          : v1?.id
            ? `/report/${v1.id}`
            : null
        : null

    const continueHref = isScript
      ? `/interview/script/${interview.id}`
      : `/interview/session/${interview.id}`

    return {
      id: interview.id as string,
      role: interview.role as string,
      difficulty: interview.difficulty as string,
      status: interview.status as string,
      startedAt: (interview.started_at as string | null) ?? null,
      completedAt: (interview.completed_at as string | null) ?? null,
      engine: isScript ? ('v2.1' as const) : ('v1' as const),
      reportHref,
      continueHref,
      score,
      abandonedResumeUsed: Boolean(interview.abandoned_resume_used),
      creditDeducted: interview.credit_deducted === true,
    }
  })

  return (
    <>
      <DashboardPageHeader
        eyebrow="Practice"
        title="Interview history"
        subtitle="Past mocks, scores, and quick links to reports."
      />
      <HistoryListClient items={items} />
    </>
  )
}
