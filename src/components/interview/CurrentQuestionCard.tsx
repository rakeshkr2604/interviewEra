/**
 * Single card: current question (dominant) + optional tip (lower hierarchy).
 * Answer Structure and Live Transcript stay outside this card.
 */

import { buildCurrentQuestionCardModel } from '@/lib/interview/current-question-card-model'

type TurnLike = {
  is_question?: boolean
  display_question?: string | null
  speech?: string | null
  tip?: string | null
}

export function CurrentQuestionCard({ turn }: { turn: TurnLike | null }) {
  const model = buildCurrentQuestionCardModel(turn)
  if (!model) return null

  return (
    <div className="shrink-0 rounded-xl border border-(--card-border)/60 bg-(--bg-secondary)/50 p-3.5 sm:p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
        Current Question
      </p>
      <p className="text-base leading-relaxed text-(--text-primary) sm:text-[1.05rem]">
        {model.question}
      </p>
      {model.tip ? (
        <p className="mt-3 text-sm leading-relaxed text-(--text-muted)">
          <span className="font-semibold text-(--accent-primary)">Tip</span>
          <span> · {model.tip}</span>
        </p>
      ) : null}
    </div>
  )
}
