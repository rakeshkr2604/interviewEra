import type { SeoQuestion } from '@/lib/seo/programmatic/types'

const sectionLabelStyle = { color: 'var(--text-primary)' } as const
const bodyStyle = { color: 'var(--text-secondary)' } as const

export function hasQuestionInsightContent(question: SeoQuestion): boolean {
  return Boolean(
    question.expertAnswer ||
      question.tip ||
      question.evaluates ||
      question.strategy ||
      question.mistakes ||
      (question.followUps && question.followUps.length > 0),
  )
}

export function QuestionInsight({ question }: { question: SeoQuestion }) {
  const expertAnswer = question.expertAnswer ?? question.tip
  const hasBody =
    expertAnswer ||
    question.evaluates ||
    question.strategy ||
    question.mistakes ||
    (question.followUps && question.followUps.length > 0)

  if (!hasBody) return null

  return (
    <details className="ie-question-insight mt-2.5 pl-8">
      <summary
        className="ie-question-insight__summary cursor-pointer text-sm font-semibold leading-snug"
        style={{ color: 'var(--accent-primary)' }}
      >
        View expert answer &amp; prep guide
      </summary>
      <div
        className="ie-question-insight__body mt-2 space-y-2 border-l-2 pl-3 text-sm leading-relaxed"
        style={{ borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))' }}
      >
        {expertAnswer ? (
          <p className="m-0" style={bodyStyle}>
            <span className="font-semibold" style={sectionLabelStyle}>
              Expert answer:{' '}
            </span>
            {expertAnswer}
          </p>
        ) : null}
        {question.evaluates ? (
          <p className="m-0" style={bodyStyle}>
            <span className="font-semibold" style={sectionLabelStyle}>
              What interviewers evaluate:{' '}
            </span>
            {question.evaluates}
          </p>
        ) : null}
        {question.strategy ? (
          <p className="m-0" style={bodyStyle}>
            <span className="font-semibold" style={sectionLabelStyle}>
              Answer strategy:{' '}
            </span>
            {question.strategy}
          </p>
        ) : null}
        {question.mistakes ? (
          <p className="m-0" style={bodyStyle}>
            <span className="font-semibold" style={{ color: 'var(--accent-warning)' }}>
              Common mistakes:{' '}
            </span>
            {question.mistakes}
          </p>
        ) : null}
        {question.followUps && question.followUps.length > 0 ? (
          <div>
            <p className="m-0 font-semibold" style={sectionLabelStyle}>
              Follow-up questions:
            </p>
            <ul className="mt-1 list-disc pl-5" style={bodyStyle}>
              {question.followUps.map((followUp) => (
                <li key={followUp}>{followUp}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  )
}
