/**
 * Shared list pagination — default page size 20, validated limits, stable
 * offset math. Lifetime totals stay on the caller (never infer from one page).
 */

export const DEFAULT_LIST_PAGE_SIZE = 20
export const MAX_LIST_PAGE_SIZE = 50
export const MIN_LIST_PAGE_SIZE = 1

export type ListPagination = {
  page: number
  pageSize: number
  offset: number
  /** Inclusive PostgREST range end. */
  rangeTo: number
}

export function clampPageSize(raw: unknown, fallback = DEFAULT_LIST_PAGE_SIZE): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(MAX_LIST_PAGE_SIZE, Math.max(MIN_LIST_PAGE_SIZE, Math.trunc(n)))
}

export function clampPage(raw: unknown, fallback = 1): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.trunc(n)
}

export function toListPagination(input: {
  page?: unknown
  pageSize?: unknown
}): ListPagination {
  const page = clampPage(input.page)
  const pageSize = clampPageSize(input.pageSize)
  const offset = (page - 1) * pageSize
  return {
    page,
    pageSize,
    offset,
    rangeTo: offset + pageSize - 1,
  }
}

export function totalPages(totalItems: number, pageSize: number): number {
  const size = clampPageSize(pageSize)
  const total = Number.isFinite(totalItems) ? Math.max(0, Math.trunc(totalItems)) : 0
  return Math.max(1, Math.ceil(total / size) || 1)
}

export type HistoryListTab = 'all' | 'completed' | 'in-progress'

export function parseHistoryTab(raw: unknown): HistoryListTab {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (value === 'completed') return 'completed'
  if (value === 'in-progress' || value === 'in_progress' || value === 'inprogress') {
    return 'in-progress'
  }
  return 'all'
}

export function parseHistoryListQuery(searchParams: {
  page?: unknown
  pageSize?: unknown
  tab?: unknown
}): ListPagination & { tab: HistoryListTab } {
  return {
    ...toListPagination(searchParams),
    tab: parseHistoryTab(searchParams.tab),
  }
}

/** Empty lists stay on page 1; overshot pages clamp to the last page. */
export function clampHistoryPage(page: number, totalForTab: number, pageSize: number): number {
  const requested = clampPage(page)
  if (totalForTab <= 0) return 1
  return Math.min(requested, totalPages(totalForTab, pageSize))
}

export function historyListHref(tab: HistoryListTab, page: number, pageSize: number): string {
  const params = new URLSearchParams()
  if (tab !== 'all') params.set('tab', tab)
  if (page > 1) params.set('page', String(page))
  if (pageSize !== DEFAULT_LIST_PAGE_SIZE) params.set('pageSize', String(pageSize))
  const query = params.toString()
  return query ? `/history?${query}` : '/history'
}
