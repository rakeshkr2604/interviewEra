import { describe, expect, it } from 'vitest'
import {
  applyIncomingCorrection,
  applyReviewValueChange,
  correctionSourceForHighlights,
  initialReviewCorrectionState,
  resolveCorrectionSource,
} from './review-correction-source'

describe('resolveCorrectionSource', () => {
  it('first payload is accepted on a fresh, unedited review', () => {
    expect(
      resolveCorrectionSource({
        userEdited: false,
        currentSource: null,
        incoming: 'Supabase corrected text',
      }),
    ).toBe('Supabase corrected text')
  })

  it('17: stale auto_structure response ignored after the candidate edited', () => {
    expect(
      resolveCorrectionSource({
        userEdited: true,
        currentSource: null,
        incoming: 'stale corrected from original raw',
      }),
    ).toBeNull()
  })

  it('18: late duplicate response does not replace an accepted source', () => {
    expect(
      resolveCorrectionSource({
        userEdited: true,
        currentSource: 'first accepted corrected transcript',
        incoming: 'late duplicate payload',
      }),
    ).toBe('first accepted corrected transcript')
  })

  it('second payload without user edits still cannot displace the first', () => {
    expect(
      resolveCorrectionSource({
        userEdited: false,
        currentSource: 'first payload',
        incoming: 'second payload',
      }),
    ).toBe('first payload')
  })

  it('null incoming never clears an owned source', () => {
    expect(
      resolveCorrectionSource({
        userEdited: false,
        currentSource: 'owned',
        incoming: null,
      }),
    ).toBe('owned')
  })
})

describe('review correction three-state model', () => {
  it('late auto_structure after manual edit does not become the highlight source', () => {
    let state = initialReviewCorrectionState()
    state = applyReviewValueChange(state, 'edit')
    state = applyIncomingCorrection(state, 'stale corrected from original raw')
    expect(state.phase).toBe('locked')
    expect(state.source).toBeNull()
    expect(correctionSourceForHighlights(state)).toBeNull()
  })

  it('late auto_structure after accepted correction keeps the frozen source', () => {
    let state = initialReviewCorrectionState()
    state = applyIncomingCorrection(state, 'I use Supabase and Postgres')
    expect(state.phase).toBe('pending')
    state = applyReviewValueChange(state, 'accept')
    expect(state.phase).toBe('accepted')
    state = applyIncomingCorrection(state, 'late duplicate payload')
    expect(state.source).toBe('I use Supabase and Postgres')
    expect(correctionSourceForHighlights(state)).toBe('I use Supabase and Postgres')
  })

  it('multiple corrections: accepting one keeps remaining suggestions from the same source', () => {
    let state = initialReviewCorrectionState()
    state = applyIncomingCorrection(state, 'I use Supabase and PostgreSQL')
    state = applyReviewValueChange(state, 'accept')
    expect(state.phase).toBe('accepted')
    expect(correctionSourceForHighlights(state)).toBe('I use Supabase and PostgreSQL')
    // A second accept on another chip stays on the same frozen source.
    state = applyReviewValueChange(state, 'accept')
    expect(state.phase).toBe('accepted')
    expect(state.source).toBe('I use Supabase and PostgreSQL')
  })

  it('correction followed by manual edit locks and hides STT highlights', () => {
    let state = initialReviewCorrectionState()
    state = applyIncomingCorrection(state, 'I use Supabase')
    state = applyReviewValueChange(state, 'accept')
    state = applyReviewValueChange(state, 'edit')
    expect(state.phase).toBe('locked')
    expect(state.source).toBe('I use Supabase')
    expect(correctionSourceForHighlights(state)).toBeNull()
    // Late payload cannot reintroduce highlights.
    state = applyIncomingCorrection(state, 'I use Superbase instead')
    expect(state.source).toBe('I use Supabase')
    expect(correctionSourceForHighlights(state)).toBeNull()
  })

  it('manual edit followed by formatting stays locked (no stale STT re-highlight)', () => {
    let state = initialReviewCorrectionState()
    state = applyIncomingCorrection(state, 'I use super base for auth')
    expect(correctionSourceForHighlights(state)).toBe('I use super base for auth')
    state = applyReviewValueChange(state, 'edit')
    state = applyReviewValueChange(state, 'format')
    expect(state.phase).toBe('locked')
    expect(correctionSourceForHighlights(state)).toBeNull()
  })

  it('formatting while pending locks so paragraph breaks cannot recreate STT suggestions', () => {
    let state = initialReviewCorrectionState()
    state = applyIncomingCorrection(state, 'I use super base for auth')
    state = applyReviewValueChange(state, 'format')
    expect(state.phase).toBe('locked')
    expect(correctionSourceForHighlights(state)).toBeNull()
    state = applyIncomingCorrection(state, 'I use Supabase for auth')
    expect(correctionSourceForHighlights(state)).toBeNull()
  })

  it('auto-applied paragraph breaks do not lock STT highlights', () => {
    let state = initialReviewCorrectionState()
    state = applyIncomingCorrection(state, 'I use super base for auth')
    state = applyReviewValueChange(state, 'paragraph-auto')
    expect(state.phase).toBe('pending')
    expect(correctionSourceForHighlights(state)).toBe('I use super base for auth')
  })

  it('idle has no highlight source even if source is somehow set', () => {
    expect(
      correctionSourceForHighlights({ phase: 'idle', source: 'should not show' }),
    ).toBeNull()
  })
})
