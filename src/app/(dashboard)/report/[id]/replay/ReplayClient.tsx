'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AnswerMode, DimensionScores, QuestionCategory } from '@/types/app.types';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';

export interface ReplayItem {
  questionId: string;
  orderIndex: number;
  questionText: string;
  category: QuestionCategory;
  answerText: string | null;
  answerMode: AnswerMode | null;
  overallScore: number | null;
  feedbackText: string | null;
  dimensionScores: DimensionScores | null;
  modelAnswerHint: string | null;
}

interface ReplayClientProps {
  reportId: string;
  role: string;
  difficulty: string;
  items: ReplayItem[];
}

const CATEGORY_BADGE_STYLE: Record<QuestionCategory, CSSProperties> = {
  technical: {
    background: 'color-mix(in srgb, #3b82f6 18%, transparent)',
    color: 'var(--text-primary)',
  },
  behavioral: {
    background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
    color: 'var(--accent-primary)',
  },
  situational: {
    background: 'color-mix(in srgb, var(--accent-warning) 20%, transparent)',
    color: 'var(--text-primary)',
  },
};

const DIMENSIONS: Array<{ key: keyof DimensionScores; label: string }> = [
  { key: 'communication_clarity', label: 'Communication Clarity' },
  { key: 'technical_depth', label: 'Technical Depth' },
  { key: 'answer_structure', label: 'Answer Structure' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'relevance', label: 'Relevance' },
];

function scoreColor(score: number): string {
  if (score >= 7) return 'var(--accent-success)';
  if (score >= 5) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

const panelClass = 'dashboard-premium-card px-5 py-4 sm:px-6 sm:py-5';

export function ReplayClient({ reportId, role, difficulty, items }: ReplayClientProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const item = items[selectedIndex];

  return (
    <div className="mx-auto w-full max-w-[min(100%,1600px)] space-y-8 px-5 py-8 lg:px-10">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/report/${reportId}`}
            className="text-sm font-medium transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Back to Report
          </Link>
          <p
            className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--accent-primary)' }}
          >
            Transcript review
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Interview Replay — {role}
          </h1>
          <p className="mt-1 text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
            {difficulty} difficulty
          </p>
        </div>
        <Link
          href={getDefaultInterviewStartPath()}
          className={buttonVariants({ variant: 'outline' })}
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
        >
          Practice Again
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[minmax(220px,280px)_1fr]">
        {/* Sidebar: question list */}
        <aside>
          <p
            className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--text-muted)' }}
          >
            Questions
          </p>
          <nav className="space-y-2" aria-label="Question navigation">
            {items.map((q, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={q.questionId}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  aria-current={isSelected ? 'true' : undefined}
                  className="w-full rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
                  style={{
                    borderColor: isSelected ? 'var(--accent-primary)' : 'var(--card-border)',
                    background: isSelected
                      ? 'color-mix(in srgb, var(--accent-primary) 8%, transparent)'
                      : 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      Q{q.orderIndex + 1}
                    </span>
                    <Badge
                      className="border-0 text-xs font-medium capitalize"
                      style={CATEGORY_BADGE_STYLE[q.category]}
                    >
                      {q.category}
                    </Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {q.questionText}
                  </p>
                  {q.overallScore !== null && (
                    <p className="mt-1.5 text-xs font-semibold tabular-nums" style={{ color: scoreColor(q.overallScore) }}>
                      {q.overallScore.toFixed(1)} / 10
                    </p>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main: selected question breakdown */}
        <div className="space-y-5 min-w-0">
          {/* Question */}
          <div className={panelClass}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                Q{item.orderIndex + 1}
              </span>
              <Badge
                className="border-0 text-xs font-medium capitalize"
                style={CATEGORY_BADGE_STYLE[item.category]}
              >
                {item.category}
              </Badge>
            </div>
            <p className="mt-3 font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {item.questionText}
            </p>
          </div>

          {/* Your answer */}
          <div className={panelClass}>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                Your answer
              </p>
              {item.answerMode === 'voice' && (
                <Badge
                  className="border-0 text-xs"
                  style={{
                    background: 'color-mix(in srgb, #3b82f6 18%, transparent)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Voice
                </Badge>
              )}
            </div>
            {item.answerText ? (
              <p
                className="mt-3 max-w-prose break-words text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.answerText}
              </p>
            ) : (
              <p className="mt-3 text-sm italic" style={{ color: 'var(--text-muted)' }}>
                No answer recorded.
              </p>
            )}
          </div>

          {/* Score + feedback */}
          {item.overallScore !== null && (
            <div className={panelClass}>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums sm:text-4xl" style={{ color: scoreColor(item.overallScore) }}>
                  {item.overallScore.toFixed(1)}
                </span>
                <span className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>
                  / 10
                </span>
                <span className="ml-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Overall score
                </span>
              </div>

              {item.feedbackText && (
                <p className="mt-4 max-w-prose text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.feedbackText}
                </p>
              )}

              {/* Dimension bars */}
              {item.dimensionScores && (
                <div className="mt-5 space-y-4 border-t pt-5" style={{ borderColor: 'var(--card-border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                    Dimension breakdown
                  </p>
                  {DIMENSIONS.map(({ key, label }) => {
                    const dimScore = item.dimensionScores![key];
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                          <span className="font-semibold tabular-nums" style={{ color: scoreColor(dimScore) }}>
                            {dimScore.toFixed(1)}/10
                          </span>
                        </div>
                        <Progress value={dimScore * 10} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Model answer */}
          {item.modelAnswerHint && (
            <div
              className="rounded-xl border-2 p-4 sm:p-5"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
                Model answer
              </p>
              <p className="mt-2.5 max-w-prose break-words text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.modelAnswerHint}
              </p>
            </div>
          )}

          {/* Previous / Next navigation */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
              disabled={selectedIndex === 0}
              className="min-h-10"
            >
              ← Previous
            </Button>
            <span className="text-sm tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {selectedIndex + 1} / {items.length}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedIndex((i) => Math.min(items.length - 1, i + 1))}
              disabled={selectedIndex === items.length - 1}
              className="min-h-10"
            >
              Next →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
