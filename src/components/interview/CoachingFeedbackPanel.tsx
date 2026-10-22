'use client'

/**
 * Left-column coaching card + "stronger answer" modal.
 * Data comes only from existing auto-structure / answer-score payloads.
 */

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AutoStructureCoaching } from '@/lib/interview/fetch-auto-structure'
import type { AnswerScore } from '@/components/interview/AnswerScoreCard'
import {
  buildCoachingFeedbackViewModel,
  type CoachingFeedbackViewModel,
} from '@/lib/interview/coaching-feedback-view'
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes'

type Props = {
  coaching: AutoStructureCoaching | null | undefined
  score: AnswerScore | null
  displayQuestion: string
  questionType?: 'behavioral' | 'technical' | null
  coachInitial: string
  loading: boolean
  failed: boolean
  onRetry: () => void
  fallbackCoaching?: string
}

function FrameworkLabel({ framework }: { framework: CoachingFeedbackViewModel['framework'] }) {
  if (framework === 'star') {
    return (
      <p className="text-[13px] leading-relaxed text-(--text-primary)">
        <span className="font-semibold">Situation</span>
        {' → '}
        <span className="font-semibold">Task</span>
        {' → '}
        <span className="font-semibold">Action</span>
        {' → '}
        <span className="font-semibold">Result</span>
      </p>
    )
  }
  return (
    <p className="text-[13px] leading-relaxed text-(--text-primary)">
      <span className="font-semibold">Problem</span>
      {' → '}
      <span className="font-semibold">Approach</span>
      {' → '}
      <span className="font-semibold">Reasoning / trade-offs</span>
      {' → '}
      <span className="font-semibold">Conclusion</span>
    </p>
  )
}

export function CoachingFeedbackPanel({
  coaching,
  score,
  displayQuestion,
  questionType,
  coachInitial,
  loading,
  failed,
  onRetry,
  fallbackCoaching,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const vm = useMemo(
    () =>
      buildCoachingFeedbackViewModel({
        coaching,
        score,
        displayQuestion,
        questionType,
        fallbackCoaching,
      }),
    [coaching, score, displayQuestion, questionType, fallbackCoaching],
  )

  return (
    <>
      <section
        className="flex min-h-[16rem] flex-col overflow-hidden rounded-2xl border px-4 py-3 sm:px-5 lg:min-h-0"
        style={{
          background: 'color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg))',
          borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, var(--card-border))',
        }}
        aria-live="polite"
      >
        <p className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-(--accent-primary)">
          How you could strengthen this
        </p>
        <p className="mb-3 shrink-0 text-[11px] text-(--text-muted)">
          Coaching only — based on the answer you just approved. Not submitted as your answer.
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {loading ? (
            <div className="flex animate-pulse flex-col gap-2">
              <div className="h-3 w-full rounded bg-(--bg-tertiary)" />
              <div className="h-3 w-4/5 rounded bg-(--bg-tertiary)" />
              <div className="h-3 w-3/5 rounded bg-(--bg-tertiary)" />
            </div>
          ) : coaching || vm.coachingParagraph ? (
            <div className="flex gap-3">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--accent-primary)/20 text-xs font-bold text-(--accent-primary)"
                aria-hidden
              >
                {coachInitial}
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                {vm.coachingParagraph ? (
                  <p className="text-sm leading-snug text-(--text-primary) sm:text-[15px]">
                    {vm.coachingParagraph}
                  </p>
                ) : vm.improvements.length === 0 ? (
                  <p className="text-sm leading-snug text-(--text-muted)">
                    No material improvements on this answer.
                  </p>
                ) : null}

                {vm.improvements.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                      What to improve
                    </p>
                    <ol className="flex flex-col gap-2.5">
                      {vm.improvements.map((item, i) => (
                        <li key={`${i}-${item.title}`} className="flex gap-3">
                          <span className="w-6 shrink-0 font-mono text-[12px] font-semibold tabular-nums text-(--accent-primary)">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold leading-snug text-(--text-primary)">
                              {item.title}
                            </p>
                            {item.detail && item.detail !== item.title ? (
                              <p className="mt-0.5 text-[12px] leading-snug text-(--text-secondary)">
                                {item.detail}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {vm.hasStrongerExample ? (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className={`inline-flex min-h-[40px] items-center gap-1 rounded-lg px-0 text-sm font-semibold text-(--accent-primary) underline-offset-4 hover:underline ${IE_FOCUS_VISIBLE}`}
                  >
                    See a stronger answer
                    <span aria-hidden>→</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : failed ? (
            <div className="space-y-3">
              <p className="text-sm text-(--text-muted)">
                Coaching couldn&apos;t be generated this time. Your score above is still saved.
              </p>
              <button
                type="button"
                onClick={onRetry}
                className={`inline-flex min-h-[36px] items-center justify-center rounded-lg border border-(--card-border) bg-(--card-bg) px-3 py-1.5 text-xs font-semibold text-(--text-primary) hover:bg-(--bg-tertiary) ${IE_FOCUS_VISIBLE}`}
              >
                Retry coaching
              </button>
            </div>
          ) : (
            <p className="text-sm text-(--text-muted)">Coaching unavailable for this turn.</p>
          )}
        </div>
      </section>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="max-h-[min(92dvh,40rem)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto overscroll-contain bg-(--card-bg) p-0 text-(--text-primary) sm:max-w-xl"
          showCloseButton
        >
          <div className="sticky top-0 z-10 border-b border-(--card-border) bg-(--card-bg) px-4 py-3 pr-12 sm:px-5">
            <DialogHeader className="gap-1">
              <DialogTitle className="text-sm font-bold tracking-wide text-(--accent-primary)">
                How to answer this question
              </DialogTitle>
              <DialogDescription className="text-[11px] text-(--text-muted)">
                Preparation guide from your feedback — a reference, not a script to memorize.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-4 py-4 sm:px-5">
            {vm.question ? (
              <section>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                  Question
                </p>
                <p className="text-[13px] leading-relaxed text-(--text-primary)">{vm.question}</p>
              </section>
            ) : null}

            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                What the interviewer wants
              </p>
              <ul className="flex flex-col gap-1.5">
                {vm.interviewerWants.map((line) => (
                  <li
                    key={line}
                    className="flex gap-2 text-[13px] leading-snug text-(--text-secondary)"
                  >
                    <span className="text-(--accent-primary)" aria-hidden>
                      •
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            {vm.missingFromAnswer.length > 0 ? (
              <section>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                  What was missing from your answer
                </p>
                <ul className="flex flex-col gap-1.5">
                  {vm.missingFromAnswer.map((line) => (
                    <li
                      key={line}
                      className="flex gap-2 text-[13px] leading-snug text-(--text-secondary)"
                    >
                      <span className="text-(--accent-primary)" aria-hidden>
                        •
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                Better answer structure
              </p>
              <FrameworkLabel framework={vm.framework} />
            </section>

            {vm.hasStrongerExample ? (
              <section>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                  Stronger version of your answer
                </p>
                <p className="mb-2 text-[11px] text-(--text-muted)">
                  A clearer rewrite of what you said — practice with it; don&apos;t memorize.
                </p>
                <div className="min-h-[7.5rem] rounded-xl border border-(--card-border)/70 bg-(--bg-secondary)/50 p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-(--text-primary) sm:text-[15px]">
                    {vm.sampleAnswerParagraphs.join('\n\n')}
                  </p>
                </div>
                {vm.strongerExampleNote ? (
                  <p className="mt-2 text-[11px] leading-snug text-(--text-muted)">
                    {vm.strongerExampleNote}
                  </p>
                ) : null}
              </section>
            ) : null}

            {vm.quickTip ? (
              <section
                className={
                  vm.hasStrongerExample
                    ? 'border-t border-(--card-border) pt-5'
                    : undefined
                }
              >
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                  Quick tip
                </p>
                <p className="text-[13px] leading-relaxed text-(--text-primary)">{vm.quickTip}</p>
              </section>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
