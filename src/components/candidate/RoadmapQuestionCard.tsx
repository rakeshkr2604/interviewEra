'use client';

import { useState, type CSSProperties } from 'react';
import { ChevronDown, Lightbulb, Loader2, Mic, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';
import type { QgAnswer } from '@/lib/question-engine/schemas';
import { qgAnswerSchema } from '@/lib/question-engine/schemas';
import type { RoadmapQuestionRecommendation } from '@/lib/candidate/types';
import { RecommendationLink } from './RecommendationLink';
import { RoadmapBulletList } from './RoadmapBulletList';
import { cn } from '@/lib/utils';

function categoryBadgeStyle(category: RoadmapQuestionRecommendation['category']): CSSProperties {
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

function difficultyBadgeStyle(difficulty: RoadmapQuestionRecommendation['difficulty']): CSSProperties {
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

/**
 * Same answer-guide pattern as /tools/question-generator's QuestionCard — reuses
 * that page's `/api/tools/question-generator/answer` endpoint (question + category
 * in, framework/mistakes/follow-ups out) since it's question-agnostic, not tied
 * to AI-generated question sets.
 */
export function RoadmapQuestionCard({
  order,
  question,
  targetRole,
}: {
  order: number;
  question: RoadmapQuestionRecommendation;
  targetRole: string;
}) {
  const [answerState, setAnswerState] = useState<AnswerState>({ status: 'idle' });
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<QuestionRating | null>(null);

  const practiceHref = `${getDefaultInterviewStartPath()}?${new URLSearchParams({
    role: targetRole,
    focus: question.dimension,
    mode: question.category === 'technical' ? 'technical' : 'mixed',
  }).toString()}`;

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
          question: question.question,
          category: question.category,
          role: targetRole,
        }),
      });

      const data = (await res.json()) as { answer?: unknown; error?: string };
      if (!res.ok) {
        setAnswerState({
          status: 'error',
          message: data.error ?? 'Could not load the answer guide. Please try again.',
        });
        return;
      }

      const parsed = qgAnswerSchema.safeParse(data.answer);
      if (!parsed.success) {
        setAnswerState({ status: 'error', message: 'Could not load the answer guide. Please try again.' });
        return;
      }

      setAnswerState({ status: 'ready', answer: parsed.data });
      setRevealed(true);
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
  }

  return (
    <article
      className="relative overflow-hidden rounded-xl border-2 p-4 pl-5 transition-all duration-200 sm:p-5"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 85%, transparent)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl opacity-90"
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
          {order}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm leading-relaxed sm:text-[0.9375rem]" style={{ color: 'var(--text-primary)' }}>
            {question.question}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-0 text-xs font-medium capitalize" style={categoryBadgeStyle(question.category)}>
              {question.category}
            </Badge>
            <Badge className="border-0 text-xs font-medium capitalize" style={difficultyBadgeStyle(question.difficulty)}>
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
              {answerState.status === 'ready' ? (revealed ? 'Hide answer guide' : 'Show answer guide') : 'How to answer'}
              {answerState.status === 'ready' && (
                <ChevronDown className={cn('size-3.5 transition-transform', revealed && 'rotate-180')} aria-hidden />
              )}
            </button>

            <RecommendationLink
              href={practiceHref}
              recommendationId={question.id}
              recommendationType="question"
              source="roadmap"
              className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Mic className="size-3.5" aria-hidden />
                Practice this in a mock interview
              </span>
            </RecommendationLink>

            <div className="ml-auto flex items-center gap-1" aria-label="Rate this question">
              <button
                type="button"
                onClick={() => rateQuestion('up')}
                disabled={rating !== null}
                title="This question was helpful"
                aria-label="This question was helpful"
                aria-pressed={rating === 'up'}
                className="inline-flex size-8 items-center justify-center rounded-full border transition-colors disabled:cursor-default"
                style={{
                  borderColor: rating === 'up' ? 'var(--accent-success)' : 'var(--card-border)',
                  background:
                    rating === 'up' ? 'color-mix(in srgb, var(--accent-success) 16%, transparent)' : 'transparent',
                  color: rating === 'up' ? 'var(--accent-success)' : 'var(--text-muted)',
                  opacity: rating === 'down' ? 0.45 : 1,
                }}
              >
                <ThumbsUp className="size-3.5" fill={rating === 'up' ? 'currentColor' : 'none'} aria-hidden />
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
                  borderColor: rating === 'down' ? 'var(--accent-danger)' : 'var(--card-border)',
                  background:
                    rating === 'down' ? 'color-mix(in srgb, var(--accent-danger) 14%, transparent)' : 'transparent',
                  color: rating === 'down' ? 'var(--accent-danger)' : 'var(--text-muted)',
                  opacity: rating === 'up' ? 0.45 : 1,
                }}
              >
                <ThumbsDown className="size-3.5" fill={rating === 'down' ? 'currentColor' : 'none'} aria-hidden />
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
              <RoadmapBulletList title="How to structure it" items={answerState.answer.answer_approach} />
              <RoadmapBulletList title="Common mistakes" items={answerState.answer.common_mistakes} />
              <RoadmapBulletList title="Likely follow-ups" items={answerState.answer.follow_ups} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
