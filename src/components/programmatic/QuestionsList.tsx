/**
 * Server-rendered question list for programmatic SEO pages.
 * Used across role, company, intersection, and skill pages.
 * Zero client JS — pure HTML for maximum crawlability.
 */

import Link from 'next/link'
import { Minus, Plus } from 'lucide-react'
import { QuestionInsight, hasQuestionInsightContent } from '@/components/programmatic/QuestionInsight'
import { mergeQuestionInsights } from '@/lib/seo/programmatic/question-insights'
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
  /** Hub pages: collapsible expert-answer cards with full insight sections. */
  expanded?: boolean
  /** Optional label beside the heading (e.g. hub-specific question count). */
  metaLabel?: string
  /** Rich structured answers for skill pages without affecting other templates. */
  variant?: 'default' | 'skill-rich'
}

export function QuestionsList({
  questions,
  heading = 'Interview Questions',
  sectionId,
  headingId,
  expanded = false,
  metaLabel,
  variant = 'default',
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
          <QuestionCard
            key={`${q.question}-${index}`}
            question={mergeQuestionInsights(q)}
            number={index + 1}
            expanded={expanded}
            variant={variant}
          />
        ))}
      </ol>
    </section>
  )
}

function QuestionCard({
  question,
  number,
  expanded,
  variant,
}: {
  question: SeoQuestion
  number: number
  expanded: boolean
  variant: 'default' | 'skill-rich'
}) {
  if (variant === 'skill-rich') {
    return <SkillQuestionCard question={question} number={number} expanded={expanded} />
  }

  const showInsight = expanded

  return (
    <li
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
      }}
    >
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

      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-8">
        <Badge label={CATEGORY_LABELS[question.category]} variant="category" />
        <Badge label={DIFFICULTY_LABELS[question.difficulty]} variant={question.difficulty} />
      </div>

      {showInsight ? (
        hasQuestionInsightContent(question) ? (
          <QuestionInsight question={question} />
        ) : null
      ) : question.tip ? (
        <p className="mt-2 pl-8 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
            Tip:{' '}
          </span>
          {question.tip}
        </p>
      ) : null}
    </li>
  )
}

function SkillQuestionCard({
  question,
  number,
  expanded,
}: {
  question: SeoQuestion
  number: number
  expanded: boolean
}) {
  const hasStructuredAnswer = Boolean(
    question.tip ||
    question.spokenAnswer ||
    (question.pointwiseAnswer && question.pointwiseAnswer.length > 0) ||
    question.starAnswer,
  )

  return (
    <li
      className="rounded-xl border"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
      }}
    >
      <details className="group" {...(expanded ? { open: true } : {})}>
        <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] focus-visible:ring-offset-2">
          <span
            className="mt-0.5 shrink-0 text-sm font-bold tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            {String(number).padStart(2, '0')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-semibold leading-snug sm:text-base" style={{ color: 'var(--text-primary)' }}>
              {question.question}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Badge label={CATEGORY_LABELS[question.category]} variant="category" />
              <Badge label={DIFFICULTY_LABELS[question.difficulty]} variant={question.difficulty} />
              {question.isScenario ? <Badge label="STAR" variant="medium" /> : null}
            </div>
          </div>
          <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors group-open:border-[color-mix(in_srgb,var(--accent-primary)_30%,var(--card-border))] group-open:bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)]" style={{ borderColor: 'var(--card-border)' }}>
            <Plus
              className="size-3.5 transition-all duration-200 group-open:scale-0 group-open:opacity-0"
              style={{ color: 'var(--accent-primary)' }}
              aria-hidden
            />
            <Minus
              className="absolute size-3.5 scale-0 opacity-0 transition-all duration-200 group-open:scale-100 group-open:opacity-100"
              style={{ color: 'var(--accent-primary)' }}
              aria-hidden
            />
          </span>
        </summary>

        {hasStructuredAnswer ? (
          <div className="border-t px-4 pb-4 pl-11 pt-4" style={{ borderColor: 'var(--card-border)' }}>
            {question.tip ? (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  Tip:{' '}
                </span>
                {question.tip}
              </p>
            ) : null}

            {question.isScenario && question.starAnswer ? (
              <div className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <StarBlock label="Situation" value={question.starAnswer.situation} />
                <StarBlock label="Task" value={question.starAnswer.task} />
                <StarBlock label="Action" value={question.starAnswer.action} />
                <StarBlock label="Result" value={question.starAnswer.result} />
              </div>
            ) : (
              <>
                {question.spokenAnswer ? (
                  <div className="mt-3">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Spoken answer
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {question.spokenAnswer}
                    </p>
                  </div>
                ) : null}

                {question.pointwiseAnswer && question.pointwiseAnswer.length > 0 ? (
                  <div className="mt-3">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Point-wise answer
                    </h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {question.pointwiseAnswer.map((point, index) => (
                        <li key={`${point}-${index}`}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </details>
    </li>
  )
}

function StarBlock({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {label}:{' '}
      </span>
      {value}
    </p>
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
