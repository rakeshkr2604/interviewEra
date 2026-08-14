/**
 * View-model for the merged Current Question + Tip card.
 * Tip is a child of the question card, not a sibling card.
 */

export type CurrentQuestionCardModel = {
  question: string
  tip: string | null
}

const TIP_PREFIX = /^tip\s*[:·—–-]\s*/i

/** Strip a leading "Tip:" / "Tip —" so the card can render `Tip · {tip}`. */
export function normalizeTipText(tip: string | null | undefined): string | null {
  if (typeof tip !== 'string') return null
  const stripped = tip.trim().replace(TIP_PREFIX, '').trim()
  return stripped || null
}

export function buildCurrentQuestionCardModel(turn: {
  is_question?: boolean
  display_question?: string | null
  speech?: string | null
  tip?: string | null
} | null): CurrentQuestionCardModel | null {
  if (!turn?.is_question) return null
  const question = (turn.display_question || turn.speech || '').trim()
  if (!question) return null
  const tip = normalizeTipText(turn.tip)
  return { question, tip }
}
