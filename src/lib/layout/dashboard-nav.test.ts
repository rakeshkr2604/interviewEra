import { describe, expect, it } from 'vitest'
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path'
import {
  buildDashboardNavSections,
  isDashboardNavItemActive,
  isDashboardNavLinkItem,
} from '@/lib/layout/dashboard-nav'

describe('buildDashboardNavSections', () => {
  it('places Interview Prep under Practice and omits a Prepare category', () => {
    const sections = buildDashboardNavSections(false)
    const sectionIds = sections.map((section) => section.id)
    expect(sectionIds).not.toContain('prepare')
    expect(sectionIds).toContain('practice')

    const practice = sections.find((section) => section.id === 'practice')
    expect(practice).toBeDefined()
    const practiceLabels = practice!.items.map((item) => item.label)
    expect(practiceLabels).toContain('Interview Prep')
    expect(practiceLabels).toContain('Start Interview')
    expect(practiceLabels).not.toContain('Resume')
    expect(practiceLabels).toContain('Interview History')

    const prepLinks = practice!.items.filter(
      (item) => isDashboardNavLinkItem(item) && item.href === '/prepare',
    )
    expect(prepLinks).toHaveLength(1)
    expect(prepLinks[0]?.label).toBe('Interview Prep')

    const start = practice!.items.find(
      (item) => isDashboardNavLinkItem(item) && item.label === 'Start Interview',
    )
    expect(start && isDashboardNavLinkItem(start) && start.href).toBe(
      getDefaultInterviewStartPath(),
    )

    // Interview Prep sits directly after Start Interview.
    const startIndex = practiceLabels.indexOf('Start Interview')
    const prepIndex = practiceLabels.indexOf('Interview Prep')
    expect(prepIndex).toBe(startIndex + 1)

    // No duplicate Interview Prep entries across the whole sidebar model.
    const allPrep = sections.flatMap((section) =>
      section.items.filter(
        (item) => isDashboardNavLinkItem(item) && item.href === '/prepare',
      ),
    )
    expect(allPrep).toHaveLength(1)
  })

  it('optionally inserts Coach in Practice without moving Interview Prep', () => {
    const practice = buildDashboardNavSections(true).find((section) => section.id === 'practice')
    const labels = practice!.items.map((item) => item.label)
    expect(labels).toEqual([
      'Start Interview',
      'Interview Prep',
      'Coach',
      'Interview History',
    ])
  })

  it('marks /prepare as active for Interview Prep', () => {
    const practice = buildDashboardNavSections(false).find((section) => section.id === 'practice')
    const prep = practice!.items.find(
      (item) => isDashboardNavLinkItem(item) && item.href === '/prepare',
    )
    expect(prep && isDashboardNavLinkItem(prep)).toBe(true)
    if (!prep || !isDashboardNavLinkItem(prep)) return
    expect(isDashboardNavItemActive('/prepare', prep)).toBe(true)
    expect(isDashboardNavItemActive('/prepare/extra', prep)).toBe(true)
    expect(isDashboardNavItemActive('/dashboard', prep)).toBe(false)
    expect(isDashboardNavItemActive('/interview/script/start', prep)).toBe(false)
  })
})
