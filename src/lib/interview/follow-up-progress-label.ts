/**
 * Core-phase progress copy. Follow-ups keep the parent question number.
 */

export function coreProgressLabels(opts: {
  isFollowUp: boolean
  questionNumber: number
  totalQuestions: number
}): { desktop: string; mobile: string } {
  const total = Math.max(opts.totalQuestions, 1)
  const n = Math.min(Math.max(opts.questionNumber, 1), total)
  if (opts.isFollowUp) {
    return {
      desktop: `Follow-up · Q${n} of ${total}`,
      mobile: 'Follow-up',
    }
  }
  return {
    desktop: `Question ${n} of ${total}`,
    mobile: `Q${n}/${total}`,
  }
}
