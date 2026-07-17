import { describe, expect, it } from 'vitest'
import { buildScriptSpeechSummary } from '@/lib/interview/script-report/speech'

describe('buildScriptSpeechSummary', () => {
  it('returns null when no transcripts', () => {
    expect(buildScriptSpeechSummary([])).toBeNull()
    expect(buildScriptSpeechSummary([{ transcript: '   ' }])).toBeNull()
  })

  it('counts fillers from transcript and marks source estimated', () => {
    const summary = buildScriptSpeechSummary([
      {
        transcript:
          'Um I think like the system was basically um caching results and like then we scaled.',
      },
    ])
    expect(summary).not.toBeNull()
    expect(summary!.source).toBe('estimated')
    expect(summary!.total_filler_count).toBeGreaterThan(0)
    expect(summary!.top_fillers.length).toBeGreaterThan(0)
    expect(summary!.total_answers).toBe(1)
  })
})
