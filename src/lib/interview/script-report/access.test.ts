import { describe, expect, it } from 'vitest'
import {
  canExportScriptReportPdf,
  canSeeScriptReportDetails,
  canSeeScriptReportPro,
  planAtLeast,
} from '@/lib/interview/script-report/access'

describe('script report plan access', () => {
  it('gates details at starter and pdf at pro', () => {
    expect(canSeeScriptReportDetails('free')).toBe(false)
    expect(canSeeScriptReportDetails('starter')).toBe(true)
    expect(canSeeScriptReportPro('starter')).toBe(false)
    expect(canSeeScriptReportPro('pro')).toBe(true)
    expect(canExportScriptReportPdf('campus')).toBe(true)
  })

  it('starter unlocks detailed feedback and roadmap; pro unlocks model answers and pdf', () => {
    expect(planAtLeast('starter', 'starter')).toBe(true)
    expect(planAtLeast('starter', 'pro')).toBe(false)
    expect(canSeeScriptReportDetails('starter')).toBe(true)
    expect(canSeeScriptReportPro('starter')).toBe(false)
    expect(canExportScriptReportPdf('starter')).toBe(false)

    expect(canSeeScriptReportDetails('pro')).toBe(true)
    expect(canSeeScriptReportPro('pro')).toBe(true)
    expect(canExportScriptReportPdf('pro')).toBe(true)
  })

  it('campus tiers inherit pro report entitlements', () => {
    expect(canSeeScriptReportDetails('campus')).toBe(true)
    expect(canSeeScriptReportPro('campus_admin')).toBe(true)
    expect(canExportScriptReportPdf('campus_admin')).toBe(true)
  })
})
