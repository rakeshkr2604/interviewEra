import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIST_PAGE_SIZE,
  MAX_LIST_PAGE_SIZE,
  clampHistoryPage,
  clampPage,
  clampPageSize,
  historyListHref,
  parseHistoryListQuery,
  parseHistoryTab,
  toListPagination,
  totalPages,
} from './list-pagination'

describe('list pagination', () => {
  it('defaults to page 1 and size 20', () => {
    expect(toListPagination({})).toEqual({
      page: 1,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
      offset: 0,
      rangeTo: 19,
    })
  })

  it('clamps oversized page sizes and invalid pages', () => {
    expect(clampPageSize(999)).toBe(MAX_LIST_PAGE_SIZE)
    expect(clampPageSize(0)).toBe(1)
    expect(clampPageSize('nope')).toBe(DEFAULT_LIST_PAGE_SIZE)
    expect(clampPage(-3)).toBe(1)
    expect(clampPage('2')).toBe(2)
  })

  it('computes offset for later pages', () => {
    expect(toListPagination({ page: 3, pageSize: 20 })).toMatchObject({
      offset: 40,
      rangeTo: 59,
    })
  })

  it('never reports zero pages', () => {
    expect(totalPages(0, 20)).toBe(1)
    expect(totalPages(21, 20)).toBe(2)
  })

  it('parses history tabs without treating page size as a lifetime count', () => {
    expect(parseHistoryTab('Completed')).toBe('completed')
    expect(parseHistoryTab('in_progress')).toBe('in-progress')
    expect(parseHistoryListQuery({ page: '2', tab: 'completed' })).toMatchObject({
      page: 2,
      tab: 'completed',
      pageSize: 20,
    })
  })

  it('clamps overshot pages without inventing a zero-item empty state', () => {
    expect(clampHistoryPage(99, 21, 20)).toBe(2)
    expect(clampHistoryPage(1, 0, 20)).toBe(1)
    expect(historyListHref('completed', 2, 20)).toBe('/history?tab=completed&page=2')
    expect(historyListHref('all', 1, 20)).toBe('/history')
  })
})
