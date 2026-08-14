import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SCRIPTS_DIR = path.join(process.cwd(), 'src/lib/ai/scripts')

describe('candidate-question prompt contract', () => {
  for (const file of ['SCRIPT_H.md', 'SCRIPT_T.md', 'SCRIPT_M.md'] as const) {
    it(`${file} keeps CQ separate, adaptive, and bounded`, () => {
      const text = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8')
      expect(text).toContain('candidate_question_action')
      expect(text).toContain('candidate_question_follow_ups')
      expect(text).toContain('maximum, not a quota')
      expect(text).toContain('NEVER core is_follow_up')
      expect(text).toContain('server owns invite and no-question guidance')
      expect(text).not.toMatch(/after at most \*\*1\*\* invite/)
      expect(text).not.toMatch(/Do NOT keep inviting "any other questions\?"/)
    })
  }
})
