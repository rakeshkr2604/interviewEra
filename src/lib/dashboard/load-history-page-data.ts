import { chunkIds } from '@/lib/dashboard/id-chunks'
import {
  clampHistoryPage,
  parseHistoryListQuery,
  toListPagination,
  type HistoryListTab,
  type ListPagination,
} from '@/lib/dashboard/list-pagination'
import { getCachedSupabase } from '@/lib/dashboard/request-cache'

export type HistoryListItem = {
  id: string
  role: string
  difficulty: string
  status: string
  startedAt: string | null
  completedAt: string | null
  engine: 'v1' | 'v2.1'
  reportHref: string | null
  continueHref: string
  score: number | null
  abandonedResumeUsed: boolean
  creditDeducted: boolean
}

export type HistoryTabCounts = Record<HistoryListTab, number>

export type HistoryPageData = {
  items: HistoryListItem[]
  tabCounts: HistoryTabCounts
  pagination: ListPagination
  tab: HistoryListTab
  totalForTab: number
}

const HISTORY_INTERVIEW_SELECT =
  'id, role, difficulty, status, started_at, completed_at, question_count, engine, credit_deducted, abandoned_resume_used' as const

export function mapHistoryItems(
  interviews: Array<Record<string, unknown>>,
  v1Reports: { id: string; interview_id: string; overall_score: number | null }[],
  v21Reports: { id: string; interview_id: string; overall: number | null; status: string }[],
): HistoryListItem[] {
  const reportByInterviewId = new Map(v1Reports.map((report) => [report.interview_id, report]))
  const scriptReportByInterviewId = new Map(
    v21Reports.map((report) => [report.interview_id, report]),
  )

  return interviews.map((interview) => {
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

    const continueHref = isScript ? `/interview/script/${interview.id}` : '/dashboard'

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
}

function applyTabFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase builder variance
  query: any,
  tab: HistoryListTab,
) {
  if (tab === 'completed') return query.eq('status', 'completed')
  if (tab === 'in-progress') return query.neq('status', 'completed')
  return query
}

export async function loadHistoryPageData(
  userId: string,
  searchParams: { page?: unknown; pageSize?: unknown; tab?: unknown },
): Promise<HistoryPageData> {
  const supabase = await getCachedSupabase()
  const parsed = parseHistoryListQuery(searchParams)

  const allQuery = supabase
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  const completedQuery = supabase
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
  const inProgressQuery = supabase
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'completed')

  const pageQuery = applyTabFilter(
    supabase
      .from('interviews')
      .select(HISTORY_INTERVIEW_SELECT)
      .eq('user_id', userId)
      .order('started_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(parsed.offset, parsed.rangeTo),
    parsed.tab,
  )

  const [allRes, completedRes, inProgressRes, pageRes] = await Promise.all([
    allQuery,
    completedQuery,
    inProgressQuery,
    pageQuery,
  ])

  const tabCounts: HistoryTabCounts = {
    all: allRes.count ?? 0,
    completed: completedRes.count ?? 0,
    'in-progress': inProgressRes.count ?? 0,
  }
  const totalForTab = tabCounts[parsed.tab]
  let pagination: ListPagination = parsed
  let interviews = (pageRes.data ?? []) as Array<Record<string, unknown> & { id: string }>

  const clampedPage = clampHistoryPage(parsed.page, totalForTab, parsed.pageSize)
  if (clampedPage !== parsed.page) {
    pagination = { ...toListPagination({ page: clampedPage, pageSize: parsed.pageSize }) }
    const retry = await applyTabFilter(
      supabase
        .from('interviews')
        .select(HISTORY_INTERVIEW_SELECT)
        .eq('user_id', userId)
        .order('started_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .range(pagination.offset, pagination.rangeTo),
      parsed.tab,
    )
    interviews = (retry.data ?? []) as Array<Record<string, unknown> & { id: string }>
  }

  const interviewIds = interviews.map((row) => row.id)

  let v1Reports: { id: string; interview_id: string; overall_score: number | null }[] = []
  let v21Reports: {
    id: string
    interview_id: string
    overall: number | null
    status: string
  }[] = []

  if (interviewIds.length > 0) {
    const reportChunks = await Promise.all(
      chunkIds(interviewIds).map(async (ids) => {
        const [v1Res, v21Res] = await Promise.all([
          supabase.from('reports').select('id, interview_id, overall_score').in('interview_id', ids),
          supabase
            .from('script_interview_reports')
            .select('id, interview_id, overall, status')
            .in('interview_id', ids),
        ])
        return { v1: v1Res.data ?? [], v21: v21Res.data ?? [] }
      }),
    )
    v1Reports = reportChunks.flatMap((chunk) => chunk.v1)
    v21Reports = reportChunks.flatMap((chunk) => chunk.v21)
  }

  const items = mapHistoryItems(interviews, v1Reports, v21Reports)

  return {
    items,
    tabCounts,
    pagination,
    tab: parsed.tab,
    totalForTab,
  }
}
