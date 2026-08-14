import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAX_WARMUP_QUESTIONS } from './turn-authority'

const SCRIPTS_DIR = path.join(process.cwd(), 'src/lib/ai/scripts')

/**
 * Warmup is exactly ONE conversational interaction. The prompts must agree with
 * the server cap, otherwise the model keeps emitting a "Ready?" second invite
 * that authority silently discards (wasted LLM call + SSE speech leak).
 */
describe('warmup prompt contract', () => {
  it('server cap is one warmup invite', () => {
    expect(MAX_WARMUP_QUESTIONS).toBe(1)
  })

  for (const file of ['SCRIPT_H.md', 'SCRIPT_T.md', 'SCRIPT_M.md'] as const) {
    it(`${file} declares warmup as exactly one invite`, () => {
      const text = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8')
      expect(text).toContain('Warmup is exactly **1** invite')
      expect(text).toContain('the only warmup turn')
      expect(text).toContain(
        'NEVER emit a 2nd warmup turn — warmup is exactly 1 invite, then self_intro (or core)',
      )
      expect(text).not.toMatch(/after \*\*2\*\* warmup invites/)
      expect(text).not.toMatch(/### TURN 2 — After candidate responds/)
    })
  }

  it('SCRIPT_H no longer ships a second warmup JSON example', () => {
    const text = fs.readFileSync(path.join(SCRIPTS_DIR, 'SCRIPT_H.md'), 'utf8')
    // "Shall we begin?" survives only inside the prohibition, never as speech.
    expect(text).not.toContain('You\'ll warm up fast. Shall we begin?')
    expect(text).not.toContain(
      'That\'s great. Today we have {total_questions} questions covering your background',
    )
  })
})
