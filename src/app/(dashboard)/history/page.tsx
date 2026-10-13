import { redirect } from 'next/navigation'
import { privatePageMetadata } from '@/lib/seo/metadata'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { getCachedAuthUser } from '@/lib/dashboard/request-cache'
import { historyListHref } from '@/lib/dashboard/list-pagination'
import { loadHistoryPageData } from '@/lib/dashboard/load-history-page-data'
import { HistoryListClient } from './HistoryListClient'

export const metadata = privatePageMetadata({
  title: 'History',
  description: 'Your completed and in-progress AI mock interviews.',
  path: '/history',
})

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; tab?: string }>
}) {
  const user = await getCachedAuthUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const data = await loadHistoryPageData(user.id, params)
  const requestedPage = Number.parseInt(String(params.page ?? '1'), 10)
  if (
    Number.isFinite(requestedPage) &&
    requestedPage > 1 &&
    data.pagination.page !== requestedPage
  ) {
    redirect(historyListHref(data.tab, data.pagination.page, data.pagination.pageSize))
  }

  return (
    <>
      <DashboardPageHeader
        eyebrow="Practice"
        title="Interview history"
        subtitle="Past mocks, scores, and quick links to reports."
      />
      <HistoryListClient
        items={data.items}
        tab={data.tab}
        tabCounts={data.tabCounts}
        page={data.pagination.page}
        pageSize={data.pagination.pageSize}
        totalForTab={data.totalForTab}
      />
    </>
  )
}
