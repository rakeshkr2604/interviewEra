import { describe, expect, it } from 'vitest'
import { buildReviewLoadTurnPayload } from '@/lib/interview/build-review-load-turn-payload'

describe('buildReviewLoadTurnPayload', () => {
  const rawAnswer =
    'so in my last project I used super a base for the data store and connect it with next jay es'

  it("choosing corrected uses edited corrected text and submittedAs 'corrected'", () => {
    const editedCorrected =
      'so in my last project I used Supabase for the data store and connect it with Next.js'
    const payload = buildReviewLoadTurnPayload({
      chosenAs: 'corrected',
      editedRaw: rawAnswer + ' (user edited left panel)',
      editedCorrected: `  ${editedCorrected}  `,
      rawAnswer,
      prevTurnIndex: 3,
    })

    expect(payload).toEqual({
      lastAnswer: editedCorrected,
      submittedAs: 'corrected',
      sttRawTranscript: rawAnswer,
      prevTurnIndex: 3,
    })
  })

  it("choosing raw uses editedRaw and submittedAs 'raw'", () => {
    const editedRaw = rawAnswer + ' — I fixed a typo myself'
    const payload = buildReviewLoadTurnPayload({
      chosenAs: 'raw',
      editedRaw,
      editedCorrected: 'SHOULD NOT BE USED',
      rawAnswer,
      prevTurnIndex: 7,
    })

    expect(payload).toEqual({
      lastAnswer: editedRaw,
      submittedAs: 'raw',
      sttRawTranscript: rawAnswer,
      prevTurnIndex: 7,
    })
  })

  it('sttRawTranscript is always the original rawAnswer regardless of edits or choice', () => {
    const forCorrected = buildReviewLoadTurnPayload({
      chosenAs: 'corrected',
      editedRaw: 'edited left',
      editedCorrected: 'edited right',
      rawAnswer,
      prevTurnIndex: 0,
    })
    const forRaw = buildReviewLoadTurnPayload({
      chosenAs: 'raw',
      editedRaw: 'edited left again',
      editedCorrected: 'edited right again',
      rawAnswer,
      prevTurnIndex: 0,
    })

    expect(forCorrected.sttRawTranscript).toBe(rawAnswer)
    expect(forRaw.sttRawTranscript).toBe(rawAnswer)
    expect(forCorrected.sttRawTranscript).not.toBe(forCorrected.lastAnswer)
    expect(forRaw.sttRawTranscript).not.toBe(forRaw.lastAnswer)
  })
})
