/**
 * Pure mapping from review-panel choices → /script/turn loadTurn payload fields.
 * Isolated so wiring (`submittedAs`, `sttRawTranscript`, `lastAnswer`) is unit-testable.
 */

export type ReviewChoice = 'raw' | 'corrected'

export type ReviewLoadTurnPayload = {
  lastAnswer: string
  submittedAs: ReviewChoice
  /** Always the original STT/typed capture at review open — never edited panel text. */
  sttRawTranscript: string
  prevTurnIndex: number
}

export function buildReviewLoadTurnPayload(args: {
  chosenAs: ReviewChoice
  editedRaw: string
  editedCorrected: string
  /** Original capture when the review popup opened (closure `rawAnswer`). */
  rawAnswer: string
  prevTurnIndex: number
}): ReviewLoadTurnPayload {
  const lastAnswer =
    args.chosenAs === 'corrected' ? args.editedCorrected.trim() : args.editedRaw

  return {
    lastAnswer,
    submittedAs: args.chosenAs,
    sttRawTranscript: args.rawAnswer,
    prevTurnIndex: args.prevTurnIndex,
  }
}
