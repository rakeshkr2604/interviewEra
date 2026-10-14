import { describe, expect, it } from 'vitest'
import { HR_ANSWER_GUIDES } from '@/lib/prep/hr-answers'
import {
  READINESS_ITEMS,
  readinessSnapshot,
  toggleReadinessId,
} from '@/lib/prep/readiness'

describe('readinessSnapshot', () => {
  it('starts empty', () => {
    const snapshot = readinessSnapshot(new Set())
    expect(snapshot.done).toBe(0)
    expect(snapshot.total).toBe(READINESS_ITEMS.length)
    expect(snapshot.percent).toBe(0)
    expect(snapshot.complete).toBe(false)
    expect(snapshot.href).toBe('/tools/ats-checker')
  })

  it('toggles items and reaches 100 percent only when every item is checked', () => {
    let checked = new Set<string>()
    const first = READINESS_ITEMS[0]!
    checked = toggleReadinessId(checked, first.id)
    expect(readinessSnapshot(checked).done).toBe(1)
    checked = toggleReadinessId(checked, first.id)
    expect(readinessSnapshot(checked).done).toBe(0)

    for (const item of READINESS_ITEMS) {
      checked = toggleReadinessId(checked, item.id)
    }
    const done = readinessSnapshot(checked)
    expect(done.complete).toBe(true)
    expect(done.percent).toBe(100)
    expect(done.done).toBe(done.total)
    expect(done.message.toLowerCase()).toContain('not proof')
  })

  it('ignores unknown ids', () => {
    const checked = toggleReadinessId(new Set(), 'not-an-item')
    expect(checked.size).toBe(0)
  })
})

describe('HR answer guides', () => {
  it('covers each question with structure, an example, mistakes, and a checklist', () => {
    expect(HR_ANSWER_GUIDES).toHaveLength(10)
    for (const guide of HR_ANSWER_GUIDES) {
      expect(guide.interviewerWants.length).toBeGreaterThan(40)
      expect(guide.structure.length).toBeGreaterThan(0)
      expect(guide.example.length).toBeGreaterThan(40)
      expect(guide.mistakes.length).toBeGreaterThan(0)
      expect(guide.checklist.length).toBeGreaterThan(0)
      expect(guide.framework.length).toBeGreaterThan(0)
    }
  })
})
