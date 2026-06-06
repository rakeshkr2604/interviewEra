/**
 * Server-rendered question list for programmatic SEO pages.
 * Used across role, company, intersection, and skill pages.
 * Zero client JS — pure HTML for maximum crawlability.
 */

import Link from 'next/link'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'

const CATEGORY_LABELS: Record<SeoQuestion['category'], string> = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  hr: 'HR',
  situational: 'Situational',
  aptitude: 'Aptitude',
}

const DIFFICULTY_LABELS: Record<SeoQuestion['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

interface QuestionsListProps {
  questions: readonly SeoQuestion[]
  /** Heading rendered above the list. */
  heading?: string
  /** Anchor id for the section wrapper (hub TOC targets). */
  sectionId?: string
  /** Anchor id for the H2 (defaults to sectionId when set). */
  headingId?: string
  /** Show expanded answer blocks (evaluates, strategy, mistakes, follow-ups). */
  expanded?: boolean
  /** Optional label beside the heading (e.g. hub-specific question count). */
  metaLabel?: string
}

export function QuestionsList({
  questions,
  heading = 'Interview Questions',
  sectionId,
  headingId,
  expanded = false,
  metaLabel,
}: QuestionsListProps) {
  const h2Id = headingId ?? sectionId
  if (questions.length === 0) {
    return (
      <section aria-label="Interview questions">
        <h2
          className="text-xl font-bold tracking-tight sm:text-2xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {heading}
        </h2>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Questions for this page are being curated. Check back soon — or{' '}
          <Link
            href="/tools/question-generator"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            generate questions instantly
          </Link>{' '}
          with our free tool.
        </p>
      </section>
    )
  }

  return (
    <section
      id={sectionId}
      aria-label={sectionId ? undefined : 'Interview questions'}
      aria-labelledby={h2Id}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id={h2Id}
          className="text-xl font-bold tracking-tight sm:text-2xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {heading}
        </h2>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {metaLabel ?? 'Placement-oriented · Updated 2026'}
        </span>
      </div>
      <ol className="mt-5 list-none space-y-4 p-0" role="list">
        {questions.map((q, index) => (
          <QuestionCard key={`${q.question}-${index}`} question={q} number={index + 1} expanded={expanded} />
        ))}
      </ol>
    </section>
  )
}

function QuestionCard({
  question,
  number,
  expanded,
}: {
  question: SeoQuestion
  number: number
  expanded: boolean
}) {
  return (
    <li
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
      }}
    >
      {/* Question row */}
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 shrink-0 text-sm font-bold tabular-nums"
          style={{ color: 'var(--text-muted)' }}
        >
          {String(number).padStart(2, '0')}
        </span>
        <p className="m-0 text-sm font-semibold leading-snug sm:text-base" style={{ color: 'var(--text-primary)' }}>
          {question.question}
        </p>
      </div>

      {/* Badge row */}
      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-8">
        <Badge label={CATEGORY_LABELS[question.category]} variant="category" />
        <Badge label={DIFFICULTY_LABELS[question.difficulty]} variant={question.difficulty} />
      </div>

      {/* Tip */}
      {question.tip ? (
        <p
          className="mt-2 pl-8 text-sm leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
            {expanded ? 'Expert answer: ' : 'Tip: '}
          </span>
          {question.tip}
        </p>
      ) : null}

      {expanded ? (
        <div className="mt-3 space-y-2 pl-8">
          {question.evaluates ? (
            <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>What interviewers evaluate: </span>
              {question.evaluates}
            </p>
          ) : null}
          {question.strategy ? (
            <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Answer strategy: </span>
              {question.strategy}
            </p>
          ) : null}
          {question.mistakes ? (
            <p className="m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Common mistakes: </span>
              {question.mistakes}
            </p>
          ) : null}
          {question.followUps && question.followUps.length > 0 ? (
            <div>
              <p className="m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Follow-up questions:</p>
              <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {question.followUps.map((followUp) => (
                  <li key={followUp}>{followUp}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function Badge({
  label,
  variant,
}: {
  label: string
  variant: 'category' | 'easy' | 'medium' | 'hard'
}) {
  const colorMap: Record<typeof variant, string> = {
    category: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
    easy: 'color-mix(in srgb, #22c55e 14%, transparent)',
    medium: 'color-mix(in srgb, #f59e0b 14%, transparent)',
    hard: 'color-mix(in srgb, #ef4444 14%, transparent)',
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: colorMap[variant], color: 'var(--text-secondary)' }}
    >
      {label}
    </span>
  )
}
