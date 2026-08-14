'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  alignTranscriptDiff,
  applyReplaceSuggestion,
  type AlignedDiffOp,
} from '@/lib/interview/corrected-transcript-guard'
import {
  applyParagraphBreaks,
  normalizeSpeechSpacing,
  spacingNeedsFix,
  suggestParagraphBreaks,
} from '@/lib/interview/transcript-readability'
import { buildHighlightRenderSegments } from '@/lib/interview/review-highlight-render'
import type { ReviewCorrectionReason } from '@/lib/interview/review-correction-source'

type Props = {
  value: string
  onChange: (next: string, reason?: ReviewCorrectionReason) => void
  correctedTranscript: string | null
  autoFocus?: boolean
  placeholder?: string
}

type ReplaceOp = Extract<AlignedDiffOp, { type: 'replace' }>

type ChipPos = { top: number; left: number; maxWidth: number }

/** Place chip under the tapped highlight, clamped inside the viewport. */
function chipPosFromRect(rect: DOMRect): ChipPos {
  const pad = 8
  const maxWidth = Math.min(22 * 16, window.innerWidth - pad * 2) // ~22rem
  let left = rect.left
  if (left + maxWidth > window.innerWidth - pad) {
    left = window.innerWidth - pad - maxWidth
  }
  if (left < pad) left = pad

  const chipApproxHeight = 120
  let top = rect.bottom + 6
  if (top + chipApproxHeight > window.innerHeight - pad) {
    top = Math.max(pad, rect.top - chipApproxHeight - 6)
  }
  return { top, left, maxWidth }
}

/**
 * Single transcript surface:
 * - Suspected STT mismatches are highlighted; tap → accept / edit / dismiss.
 * - Click anywhere else (or type) edits the same box in place — no second textarea.
 */
export function ReviewAnswerHighlightEditor({
  value,
  onChange,
  correctedTranscript,
  autoFocus,
  placeholder,
}: Props) {
  const [activeOpIndex, setActiveOpIndex] = useState<number | null>(null)
  const [chipPos, setChipPos] = useState<ChipPos | null>(null)
  // Manual spelling the candidate types when the auto-suggestion is wrong.
  const [manualEdit, setManualEdit] = useState('')
  // 'review' = highlight view; 'edit' = same box becomes a plain textarea.
  const [mode, setMode] = useState<'review' | 'edit'>('review')
  const [prevCorrected, setPrevCorrected] = useState(correctedTranscript)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeBtnRef = useRef<HTMLButtonElement | null>(null)
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const manualInputRef = useRef<HTMLInputElement | null>(null)
  // When entering full-answer edit from a highlight, select that word span.
  const pendingSelectRef = useRef<{ start: number; end: number } | null>(null)

  // Correction payload refreshed (e.g. auto-structure arrived) — close any open chip.
  if (correctedTranscript !== prevCorrected) {
    setPrevCorrected(correctedTranscript)
    if (activeOpIndex !== null) {
      setActiveOpIndex(null)
      setChipPos(null)
      setManualEdit('')
    }
  }

  const ops = useMemo(() => {
    if (!correctedTranscript?.trim() || !value.trim()) return [] as AlignedDiffOp[]
    return alignTranscriptDiff(value, correctedTranscript)
  }, [value, correctedTranscript])

  const replaceOps = useMemo(
    () =>
      ops
        .map((op, index) => ({ op, index }))
        .filter(
          (row): row is { op: ReplaceOp; index: number } => row.op.type === 'replace',
        ),
    [ops],
  )

  // Render model sliced from the CURRENT value — visible text must equal the
  // editor value exactly (whitespace/newlines included), never a token re-join.
  const renderSegments = useMemo(
    () => buildHighlightRenderSegments(value, ops),
    [value, ops],
  )

  const activeReplace =
    activeOpIndex !== null && ops[activeOpIndex]?.type === 'replace'
      ? (ops[activeOpIndex] as ReplaceOp)
      : null

  // Reposition (or close) when the transcript scrolls / viewport resizes.
  useLayoutEffect(() => {
    if (activeOpIndex === null) return

    const reposition = () => {
      const btn = activeBtnRef.current
      if (!btn) {
        setActiveOpIndex(null)
        setChipPos(null)
        return
      }
      setChipPos(chipPosFromRect(btn.getBoundingClientRect()))
    }

    reposition()
    const root = scrollRootRef.current
    root?.addEventListener('scroll', reposition, { passive: true })
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      root?.removeEventListener('scroll', reposition)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [activeOpIndex])

  // Focus the manual-edit input when the chip opens.
  useEffect(() => {
    if (activeOpIndex === null) return
    // Don't steal focus from the Apply flow — just ready the input for typing.
    const t = window.setTimeout(() => manualInputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [activeOpIndex])

  // Entering edit mode: focus textarea; select the highlighted word if requested.
  useEffect(() => {
    if (mode !== 'edit') return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    const sel = pendingSelectRef.current
    pendingSelectRef.current = null
    if (sel) {
      el.setSelectionRange(sel.start, sel.end)
    } else {
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, [mode])

  const closeChip = () => {
    setActiveOpIndex(null)
    setChipPos(null)
    setManualEdit('')
    activeBtnRef.current = null
  }

  const acceptReplace = (op: ReplaceOp, replacement?: string) => {
    const next = (replacement ?? op.suggestion).trim()
    if (!next) return
    // Exact suggestion → remaining STT chips can stay. A custom spelling
    // makes this span the candidate's — lock so it cannot be re-highlighted.
    const reason: ReviewCorrectionReason =
      next === op.suggestion.trim() ? 'accept' : 'edit'
    onChange(applyReplaceSuggestion(value, op, next), reason)
    closeChip()
  }

  const enterEdit = (selectRange?: { start: number; end: number }) => {
    closeChip()
    pendingSelectRef.current = selectRange ?? null
    setMode('edit')
  }

  const paragraphBreaks = useMemo(() => suggestParagraphBreaks(value), [value])
  const needsSpacing = useMemo(() => spacingNeedsFix(value), [value])
  const breakAtSet = useMemo(
    () => new Set(paragraphBreaks.map((b) => b.insertAt)),
    [paragraphBreaks],
  )

  const applyAllParagraphs = () => {
    closeChip()
    onChange(applyParagraphBreaks(value, paragraphBreaks), 'format')
  }

  const applyOneParagraph = (insertAt: number) => {
    closeChip()
    onChange(applyParagraphBreaks(value, [{ insertAt }]), 'format')
  }

  const applySpacingFix = () => {
    closeChip()
    onChange(normalizeSpeechSpacing(value), 'format')
  }

  const readabilityActions =
    needsSpacing || paragraphBreaks.length > 0 ? (
      <div className="flex shrink-0 flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
          Formatting
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {paragraphBreaks.length > 0 && (
            <button
              type="button"
              data-stt-suggest
              onClick={applyAllParagraphs}
              className="min-h-[36px] touch-manipulation rounded-lg border border-(--card-border) bg-(--bg-secondary) px-2.5 text-[11px] font-medium text-(--text-primary) hover:border-(--accent-primary)/40"
            >
              Add paragraph breaks ({paragraphBreaks.length})
            </button>
          )}
          {needsSpacing && (
            <button
              type="button"
              data-stt-suggest
              onClick={applySpacingFix}
              className="min-h-[36px] touch-manipulation rounded-lg border border-(--card-border) bg-(--bg-secondary) px-2.5 text-[11px] font-medium text-(--text-primary) hover:border-(--accent-primary)/40"
            >
              Fix spacing
            </button>
          )}
        </div>
      </div>
    ) : null

  const sharedBoxClass =
    'w-full min-h-[7.5rem] flex-1 resize-none overflow-y-auto whitespace-pre-wrap border-0 bg-transparent p-0 text-sm leading-relaxed text-(--text-primary) outline-none placeholder:text-(--text-muted) sm:text-[15px]'

  // No remaining word suggestions (or still loading) — one plain editable transcript.
  if (mode === 'edit' || !correctedTranscript?.trim() || replaceOps.length === 0) {
    return (
      <div className="flex min-h-[7.5rem] flex-1 flex-col gap-2 overflow-hidden">
        <textarea
          ref={textareaRef}
          data-clarity-mask="true"
          value={value}
          onChange={(e) => onChange(e.target.value, 'edit')}
          onBlur={() => setMode('review')}
          placeholder={placeholder}
          autoFocus={autoFocus || mode === 'edit'}
          className={sharedBoxClass}
        />
        {readabilityActions}
      </div>
    )
  }

  const chip =
    activeReplace && chipPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            data-stt-suggest
            role="dialog"
            aria-label="Suggested correction"
            className="fixed z-[100] flex w-full flex-col gap-2 rounded-xl border border-(--card-border) bg-(--card-bg) px-3 py-2.5 shadow-lg"
            style={{
              top: chipPos.top,
              left: chipPos.left,
              maxWidth: chipPos.maxWidth,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-(--text-muted)">Suggested</span>
              <button
                type="button"
                onClick={() => acceptReplace(activeReplace)}
                className="min-h-[40px] touch-manipulation rounded-lg bg-(--accent-primary) px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {activeReplace.suggestion}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-(--text-muted)" htmlFor="stt-manual-fix">
                Or type the correct spelling
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="stt-manual-fix"
                  ref={manualInputRef}
                  data-stt-suggest
                  type="text"
                  value={manualEdit}
                  onChange={(e) => setManualEdit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      acceptReplace(activeReplace, manualEdit)
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      closeChip()
                    }
                  }}
                  placeholder={activeReplace.rawText}
                  className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-(--card-border) bg-(--bg-secondary) px-2.5 text-sm text-(--text-primary) outline-none focus:border-(--accent-primary)"
                />
                <button
                  type="button"
                  disabled={!manualEdit.trim()}
                  onClick={() => acceptReplace(activeReplace, manualEdit)}
                  className="min-h-[40px] shrink-0 touch-manipulation rounded-lg border border-(--accent-primary) px-3 text-sm font-semibold text-(--accent-primary) hover:bg-(--accent-primary)/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <button
                type="button"
                onClick={closeChip}
                className="min-h-[36px] touch-manipulation text-xs text-(--text-muted) hover:text-(--text-primary)"
              >
                Keep as-is
              </button>
              <button
                type="button"
                onClick={() =>
                  enterEdit({ start: activeReplace.rawStart, end: activeReplace.rawEnd })
                }
                className="min-h-[36px] touch-manipulation text-xs font-medium text-(--accent-primary) hover:underline"
              >
                Edit in answer
              </button>
            </div>
          </div>,
          document.body,
        )
      : null

  const breakMarker = (insertAt: number) => (
    <button
      key={`para-${insertAt}`}
      type="button"
      data-stt-suggest
      onClick={(e) => {
        e.stopPropagation()
        applyOneParagraph(insertAt)
      }}
      className="mx-0.5 inline-flex min-h-[28px] items-center rounded-md border border-dashed border-(--accent-primary)/40 bg-(--accent-primary)/10 px-1.5 py-0.5 align-middle text-[10px] font-semibold tracking-wide text-(--accent-primary) touch-manipulation hover:bg-(--accent-primary)/20"
      aria-label="Insert paragraph break here"
      title="Insert paragraph break"
    >
      ¶ break
    </button>
  )

  return (
    <>
      <div className="flex min-h-[7.5rem] flex-1 flex-col gap-2 overflow-hidden">
        <div
          ref={scrollRootRef}
          className={sharedBoxClass + ' cursor-text'}
          data-clarity-mask="true"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('[data-stt-suggest]')) return
            enterEdit()
          }}
          onKeyDown={(e) => {
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
              e.preventDefault()
              onChange(value + e.key, 'edit')
              enterEdit()
            } else if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault()
              enterEdit()
            }
          }}
          role="textbox"
          aria-multiline="true"
          aria-label="Your answer transcript"
          tabIndex={0}
        >
          {renderSegments.map((seg, i) => {
            const leadingBreak =
              breakAtSet.has(seg.start) ? breakMarker(seg.start) : null

            if (seg.kind === 'text') {
              return (
                <span key={`txt-${i}-${seg.start}`}>
                  {leadingBreak}
                  {seg.text}
                </span>
              )
            }
            if (seg.kind === 'replace') {
              const opIndex = seg.opIndex
              const isActive = activeOpIndex === opIndex
              return (
                <span key={`rep-${i}-${seg.start}`}>
                  {leadingBreak}
                  <button
                    type="button"
                    data-stt-suggest
                    ref={isActive ? activeBtnRef : undefined}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isActive) {
                        closeChip()
                        return
                      }
                      const btn = e.currentTarget
                      activeBtnRef.current = btn
                      setChipPos(chipPosFromRect(btn.getBoundingClientRect()))
                      setManualEdit(seg.text)
                      setActiveOpIndex(opIndex)
                    }}
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center rounded-md px-1.5 py-1 text-left align-baseline font-medium underline decoration-2 underline-offset-4 touch-manipulation transition-colors ${
                      isActive
                        ? 'bg-(--accent-primary)/20 text-(--accent-primary) decoration-(--accent-primary)'
                        : 'bg-amber-500/15 text-(--text-primary) decoration-amber-600/70 hover:bg-amber-500/25'
                    }`}
                    aria-label={`Suggested correction: ${seg.suggestion}`}
                    aria-expanded={isActive}
                  >
                    {seg.text}
                  </button>
                </span>
              )
            }
            // delete — struck-through span the correction would remove
            return (
              <span
                key={`del-${i}-${seg.start}`}
                className="bg-red-500/10 text-(--text-secondary) line-through"
              >
                {leadingBreak}
                {seg.text}
              </span>
            )
          })}
        </div>
        {readabilityActions}
      </div>
      {chip}
    </>
  )
}
