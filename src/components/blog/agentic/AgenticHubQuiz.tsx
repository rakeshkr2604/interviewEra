'use client'

import { useState } from 'react'
import type { AgenticPartQuiz } from '@/lib/seo/blog/agentic-ai-hub-quizzes'

export function AgenticHubQuiz({ quiz }: { quiz: AgenticPartQuiz }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})

  const choose = (qIndex: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }))
    setRevealed((prev) => ({ ...prev, [qIndex]: true }))
  }

  return (
    <aside className="ie-agentic-quiz" aria-label={quiz.title}>
      <p className="ie-agentic-quiz__title">{quiz.title}</p>
      <p className="ie-agentic-quiz__hint">Self-check — tap an answer for instant feedback.</p>
      <div className="ie-agentic-quiz__questions">
        {quiz.questions.map((q, qi) => {
          const selected = answers[qi]
          const show = revealed[qi]
          const correct = selected === q.correctIndex
          return (
            <div key={q.question} className="ie-agentic-quiz__card">
              <p className="ie-agentic-quiz__question">
                <span className="ie-agentic-quiz__qnum">Q{qi + 1}.</span> {q.question}
              </p>
              <ul className="ie-agentic-quiz__options" role="radiogroup" aria-label={q.question}>
                {q.options.map((opt, oi) => {
                  const isSelected = selected === oi
                  const isCorrect = oi === q.correctIndex
                  let stateClass = ''
                  if (show && isSelected && isCorrect) stateClass = ' is-correct'
                  if (show && isSelected && !isCorrect) stateClass = ' is-wrong'
                  if (show && !isSelected && isCorrect) stateClass = ' is-reveal-correct'
                  return (
                    <li key={opt}>
                      <button
                        type="button"
                        className={`ie-agentic-quiz__option${stateClass}`}
                        onClick={() => choose(qi, oi)}
                        role="radio"
                        aria-checked={isSelected}
                        disabled={show}
                      >
                        {opt}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {show ? (
                <p className={`ie-agentic-quiz__feedback${correct ? ' is-correct' : ' is-wrong'}`}>
                  {correct ? 'Correct — ' : 'Not quite — '}
                  {q.explanation}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
