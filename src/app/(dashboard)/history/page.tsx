import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { privatePageMetadata } from '@/lib/seo/metadata'

export const metadata = privatePageMetadata({
  title: 'History',
  description: 'Your completed and in-progress AI mock interviews.',
  path: '/history',
})
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { HistoryListClient } from './HistoryListClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: interviews } = await supabase
    .from('interviews')
    .select('id, role, difficulty, status, started_at, completed_at, question_count')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  const interviewIds = (interviews || []).map((i) => i.id as string)

  const { data: reports } =
    interviewIds.length > 0
      ? await supabase
          .from('reports')
          .select('id, interview_id, overall_score')
          .in('interview_id', interviewIds)
      : { data: [] as { id: string; interview_id: string; overall_score: number | null }[] }

  const reportByInterviewId = new Map(
    (reports || []).map((r) => [r.interview_id as string, r]),
  )

  const items = (interviews || []).map((interview) => {
    const report = reportByInterviewId.get(interview.id as string)
    return {
      id: interview.id as string,
      role: interview.role as string,
      difficulty: interview.difficulty as string,
      status: interview.status as string,
      startedAt: interview.started_at as string,
      reportId: report?.id ?? null,
      score: report?.overall_score ?? null,
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
