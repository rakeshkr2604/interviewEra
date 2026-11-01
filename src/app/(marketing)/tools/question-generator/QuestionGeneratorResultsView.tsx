'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  Info,
  Lightbulb,
  Loader2,
  Mic,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { QgAnswer, QgQuestion, QgResultMeta } from '@/lib/question-engine/schemas';
import { qgAnswerSchema } from '@/lib/question-engine/schemas';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import {
  trackQgAnswerReveal,
  trackQgPracticeClick,
  trackQgQuestionRated,
} from './qg-analytics';
import { cn } from '@/lib/utils';
import {
  FreeToolAuthGate,
  isFreeToolGateCode,
  useFreeToolAuthGate,
} from '@/components/tools/FreeToolAuthGate';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';

function categoryBadgeStyle(category: QgQuestion['category']): CSSProperties {
  const map = {
    technical: {
      background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
      color: 'var(--accent-primary)',
      boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
    },
    behavioral: {
      background: 'color-mix(in srgb, var(--accent-hover) 18%, transparent)',
      color: 'var(--accent-hover)',
      boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-hover) 35%, transparent)',
    },
    situational: {
      background: 'color-mix(in srgb, var(--accent-warning) 18%, transparent)',
      color: 'var(--accent-warning)',
      boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-warning) 32%, transparent)',
    },
  } as const;
  return map[category];
}

function difficultyBadgeStyle(difficulty: QgQuestion['difficulty']): CSSProperties {
  const map = {
    easy: {
      background: 'color-mix(in srgb, var(--accent-success) 16%, transparent)',
      color: 'var(--accent-success)',
      boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-success) 32%, transparent)',
    },
    medium: {
      background: 'color-mix(in srgb, var(--accent-warning) 16%, transparent)',
      color: 'var(--accent-warning)',
      boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-warning) 32%, transparent)',
    },
    hard: {
      background: 'color-mix(in srgb, var(--accent-danger) 14%, transparent)',
      color: 'var(--accent-danger)',
      boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-danger) 30%, transparent)',
    },
  } as const;
  return map[difficulty];
}

type AnswerState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; answer: QgAnswer }
  | { status: 'error'; message: string };

type QuestionRating = 'up' | 'down';

function AnswerSection({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="space-y-1.5">
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span
              className="mt-[0.45rem] size-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--accent-primary)' }}
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionCard({ question, meta }: { question: QgQuestion; meta: QgResultMeta }) {
  const [answerState, setAnswerState] = useState<AnswerState>({ status: 'idle' });
  const [revealed, setRevealed] = useState(false);
  const [revealTracked, setRevealTracked] = useState(false);
  const [rating, setRating] = useState<QuestionRating | null>(null);
  const { gateReason, openGate, closeGate } = useFreeToolAuthGate('question_generator');

  const practiceHref = meta.role
    ? `${getDefaultInterviewStartPath()}?role=${encodeURIComponent(meta.role)}&src=qg`
    : `${getDefaultInterviewStartPath()}?src=qg`;

  async function revealAnswer() {
    if (answerState.status === 'ready') {
      setRevealed((v) => !v);
      return;
    }
    if (answerState.status === 'loading') return;

    setAnswerState({ status: 'loading' });
    try {
      const res = await fetch('/api/tools/question-generator/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question_text,
          category: question.category,
          ...(meta.role ? { role: meta.role } : {}),
          ...(meta.level ? { level: meta.level } : {}),
          ...(meta.topic ? { topic: meta.topic } : {}),
        }),
      });

      const data = (await res.json()) as { answer?: unknown; error?: string; code?: string };
      if ((res.status === 401 || res.status === 403) && isFreeToolGateCode(data.code)) {
        setAnswerState({ status: 'idle' });
        openGate(data.code);
        return;
      }
      if (!res.ok) {
        setAnswerState({
          status: 'error',
          message: data.error ?? 'Could not load the answer guide. Please try again.',
        });
        return;
      }

      const parsed = qgAnswerSchema.safeParse(data.answer);
      if (!parsed.success) {
        setAnswerState({
          status: 'error',
          message: 'Could not load the answer guide. Please try again.',
        });
        return;
      }

      setAnswerState({ status: 'ready', answer: parsed.data });
      setRevealed(true);
      if (!revealTracked) {
        setRevealTracked(true);
        trackQgAnswerReveal({ category: question.category, difficulty: question.difficulty });
      }
    } catch {
      setAnswerState({
        status: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
    }
  }

  function rateQuestion(nextRating: QuestionRating): void {
    if (rating !== null) return;
    setRating(nextRating);
    trackQgQuestionRated({
      rating: nextRating,
      category: question.category,
      difficulty: question.difficulty,
      mode: meta.mode,
      order: question.order,
    });
  }

  return (
    <article
      className="group relative overflow-hidden rounded-xl border-2 p-4 pl-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 85%, transparent)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl opacity-90 transition-opacity group-hover:opacity-100"
        style={{ background: 'var(--accent-primary)' }}
        aria-hidden
      />
      <div className="flex gap-3 sm:gap-4">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 20%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          {question.order}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <p
            className="text-sm leading-relaxed sm:text-[0.9375rem]"
            style={{ color: 'var(--text-primary)' }}
          >
            {question.question_text}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="border-0 text-xs font-medium capitalize"
              style={categoryBadgeStyle(question.category)}
            >
              {question.category}
            </Badge>
            <Badge
              className="border-0 text-xs font-medium capitalize"
              style={difficultyBadgeStyle(question.difficulty)}
            >
              {question.difficulty}
            </Badge>
          </div>

          <p className="text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              What they&apos;re testing:
            </span>{' '}
            {question.probing}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={revealAnswer}
              disabled={answerState.status === 'loading'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                answerState.status === 'loading' && 'cursor-wait opacity-70',
              )}
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              {answerState.status === 'loading' ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Lightbulb className="size-3.5" aria-hidden />
              )}
              {answerState.status === 'ready'
                ? revealed
                  ? 'Hide answer guide'
                  : 'Show answer guide'
                : 'How to answer'}
              {answerState.status === 'ready' && (
                <ChevronDown
                  className={cn('size-3.5 transition-transform', revealed && 'rotate-180')}
                  aria-hidden
                />
              )}
            </button>

            <Link
              href={practiceHref}
              onClick={() => trackQgPracticeClick({ role: meta.role, level: meta.level })}
              className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: 'var(--card-border)',
                color: 'var(--text-secondary)',
              }}
            >
              <Mic className="size-3.5" aria-hidden />
              Practice this in a mock interview
            </Link>

            <div
              className="ml-auto flex items-center gap-1"
              aria-label="Rate this question"
            >
              <button
                type="button"
                onClick={() => rateQuestion('up')}
                disabled={rating !== null}
                title="This question was helpful"
                aria-label="This question was helpful"
                aria-pressed={rating === 'up'}
                className="inline-flex size-8 items-center justify-center rounded-full border transition-colors disabled:cursor-default"
                style={{
                  borderColor:
                    rating === 'up' ? 'var(--accent-success)' : 'var(--card-border)',
                  background:
                    rating === 'up'
                      ? 'color-mix(in srgb, var(--accent-success) 16%, transparent)'
                      : 'transparent',
                  color:
                    rating === 'up' ? 'var(--accent-success)' : 'var(--text-muted)',
                  opacity: rating === 'down' ? 0.45 : 1,
                }}
              >
                <ThumbsUp
                  className="size-3.5"
                  fill={rating === 'up' ? 'currentColor' : 'none'}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                onClick={() => rateQuestion('down')}
                disabled={rating !== null}
                title="This question wasn't helpful"
                aria-label="This question wasn't helpful"
                aria-pressed={rating === 'down'}
                className="inline-flex size-8 items-center justify-center rounded-full border transition-colors disabled:cursor-default"
                style={{
                  borderColor:
                    rating === 'down' ? 'var(--accent-danger)' : 'var(--card-border)',
                  background:
                    rating === 'down'
                      ? 'color-mix(in srgb, var(--accent-danger) 14%, transparent)'
                      : 'transparent',
                  color:
                    rating === 'down' ? 'var(--accent-danger)' : 'var(--text-muted)',
                  opacity: rating === 'up' ? 0.45 : 1,
                }}
              >
                <ThumbsDown
                  className="size-3.5"
                  fill={rating === 'down' ? 'currentColor' : 'none'}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          {rating !== null && (
            <p className="text-right text-[11px]" style={{ color: 'var(--text-muted)' }} role="status">
              Thanks for the feedback.
            </p>
          )}

          {answerState.status === 'error' && (
            <p className="text-xs font-medium" style={{ color: 'var(--accent-danger)' }} role="alert">
              {answerState.message}
            </p>
          )}

          {gateReason ? (
            <FreeToolAuthGate tool="question_generator" reason={gateReason} onDismiss={closeGate} />
          ) : null}

          {answerState.status === 'ready' && revealed && (
            <div
              className="space-y-4 rounded-xl border-2 p-4"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-primary) 24%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Framework: <span style={{ color: 'var(--accent-primary)' }}>{answerState.answer.framework}</span>
              </p>
              <AnswerSection title="How to structure it" items={answerState.answer.answer_approach} />
              <AnswerSection title="Common mistakes" items={answerState.answer.common_mistakes} />
              <AnswerSection title="Likely follow-ups" items={answerState.answer.follow_ups} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function QuestionGeneratorResultsView({
  questions,
  meta,
  showBackLink = true,
  root: RootTag = 'main',
}: {
  questions: QgQuestion[];
  meta: QgResultMeta;
  showBackLink?: boolean;
  root?: 'main' | 'section';
}) {
  return (
    <RootTag
      className="ie-landing-type relative overflow-hidden pb-20 pt-8 sm:pb-28 sm:pt-12 md:pb-32"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -right-[14%] top-[8%] h-[min(18rem,60vw)] w-[min(18rem,60vw)] rounded-full blur-[100px]"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 18%, transparent)' }}
        />
      </div>

      <div className={cn('relative', LANDING_PAGE_CONTAINER)}>
        {showBackLink && (
          <Link
            href="/tools/question-generator"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Generate another set
          </Link>
        )}

        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
              Your question set
            </h1>
            <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Not a random list — each card shows what the interviewer is testing. Open the answer
              guide for structure, mistakes to avoid, and likely follow-ups.
            </p>
          </div>

          {meta.mode === 'company' && (
            <div
              className="flex items-start gap-2 rounded-xl border-2 px-4 py-3"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-warning) 35%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-warning) 8%, transparent)',
              }}
              role="note"
            >
              <Info
                className="mt-0.5 size-4 shrink-0"
                style={{ color: 'var(--accent-warning)' }}
                aria-hidden
              />
              <p className="text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                AI-generated practice questions modeled on{' '}
                <span className="font-semibold">{meta.company || 'this company'}</span>&apos;s
                publicly known interview style and values — not real or leaked questions, and
                actual questions will vary.
              </p>
            </div>
          )}

          <ol className="space-y-3">
            {questions.map((q) => (
              <li key={q.order}>
                <QuestionCard question={q} meta={meta} />
              </li>
            ))}
          </ol>

          <FreeToolCtaBlock
            title="Ready to answer these out loud?"
            body="Upload your resume and practice with our AI interviewer — timing, filler words, and scoring included. Free to start."
            href="/signup"
            ctaLabel="Start practicing free"
          />
        </div>
      </div>
    </RootTag>
  );
}
