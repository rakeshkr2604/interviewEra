import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('PATCH /api/interview/script/complete already-completed', () => {
  it('returns 200 alreadyCompleted instead of 400', () => {
    const text = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/interview/script/complete/route.ts'),
      'utf8',
    )
    // Repair path must stay 200 + alreadyCompleted (not 400). Retention is
    // returned in-request so the client can refresh streak without a reload.
    expect(text).toContain('alreadyCompleted: true')
    expect(text).toContain('retention')
    expect(text).not.toContain("error: 'Interview already completed'")
  })
})
