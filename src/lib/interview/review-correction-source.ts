/**
 * Ownership rule for the review-editor STT-correction source.
 *
 * Race fixed: step-1 auto_structure runs against the ORIGINAL raw answer.
 * If the candidate edits `editedRaw` before that response lands, diffing the
 * stale corrected_transcript against the edited text re-flags words the
 * candidate already fixed.
 *
 * Three explicit client/view-model states (no backend model):
 *   pending  — auto-correction suggestions may be displayed
 *   accepted — at least one suggestion was applied; remaining pending
 *              suggestions from the SAME frozen source may still show
 *   locked   — user manually edited or applied formatting; STT highlights
 *              are suppressed so a late payload cannot re-flag spans
 */

export type ReviewCorrectionReason = 'accept' | 'edit' | 'format'

export type ReviewCorrectionPhase = 'idle' | 'pending' | 'accepted' | 'locked'

export type ReviewCorrectionState = {
  phase: ReviewCorrectionPhase
  source: string | null
}

export function initialReviewCorrectionState(): ReviewCorrectionState {
  return { phase: 'idle', source: null }
}

export function resolveCorrectionSource(opts: {
  /** Candidate has manually changed the editor value this review session. */
  userEdited: boolean
  /** Correction source currently owned by this review generation. */
  currentSource: string | null
  /** Incoming corrected_transcript from a (possibly late) auto_structure response. */
  incoming: string | null
}): string | null {
  if (opts.userEdited) return opts.currentSource
  if (opts.currentSource !== null) return opts.currentSource
  return opts.incoming
}

function sourceIsFrozen(phase: ReviewCorrectionPhase): boolean {
  return phase === 'accepted' || phase === 'locked'
}

/** Apply a (possibly late) auto_structure corrected_transcript. */
export function applyIncomingCorrection(
  state: ReviewCorrectionState,
  incoming: string | null,
): ReviewCorrectionState {
  const nextSource = resolveCorrectionSource({
    userEdited: sourceIsFrozen(state.phase),
    currentSource: state.source,
    incoming,
  })
  if (state.phase === 'idle' && nextSource) {
    return { phase: 'pending', source: nextSource }
  }
  return { ...state, source: nextSource }
}

/** Classify an editor-value change into pending / accepted / locked. */
export function applyReviewValueChange(
  state: ReviewCorrectionState,
  reason: ReviewCorrectionReason,
): ReviewCorrectionState {
  if (reason === 'edit' || reason === 'format') {
    return { ...state, phase: 'locked' }
  }
  if (reason === 'accept') {
    if (state.phase === 'locked') return state
    return { ...state, phase: 'accepted' }
  }
  return state
}

/**
 * What the highlight editor may diff against.
 * Locked (manual edit / formatting) → null so stale STT suggestions cannot
 * be recomputed against the new text. Accepted keeps the frozen source so
 * remaining un-applied suggestions can still be shown.
 */
export function correctionSourceForHighlights(
  state: ReviewCorrectionState,
): string | null {
  if (state.phase === 'locked' || state.phase === 'idle') return null
  return state.source
}
