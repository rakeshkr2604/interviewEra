import { describe, expect, it } from 'vitest'
import {
  canExportScriptReportPdf,
  canSeeScriptReportDetails,
  canSeeScriptReportPro,
} from '@/lib/interview/script-report/access'

describe('script report plan access', () => {
  it('gates details at starter and pdf at pro', () => {
    expect(canSeeScriptReportDetails('free')).toBe(false)
    expect(canSeeScriptReportDetails('starter')).toBe(true)
    expect(canSeeScriptReportPro('starter')).toBe(false)
    expect(canSeeScriptReportPro('pro')).toBe(true)
    expect(canExportScriptReportPdf('campus')).toBe(true)
  })
})
