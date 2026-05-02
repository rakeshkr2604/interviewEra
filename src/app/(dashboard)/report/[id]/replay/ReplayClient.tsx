'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { AnswerMode, DimensionScores, QuestionCategory } from '@/types/app.types';

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

const CATEGORY_STYLES: Record<QuestionCategory, string> = {
  technical: 'bg-blue-100 text-blue-700',
  behavioral: 'bg-purple-100 text-purple-700',
  situational: 'bg-orange-100 text-orange-700',
};

const DIMENSIONS: Array<{ key: keyof DimensionScores; label: string }> = [
  { key: 'communication_clarity', label: 'Communication Clarity' },
  { key: 'technical_depth', label: 'Technical Depth' },
  { key: 'answer_structure', label: 'Answer Structure' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'relevance', label: 'Relevance' },
];

function scoreColorClass(score: number): string {
  if (score >= 7) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
}

export function ReplayClient({ reportId, role, difficulty, items }: ReplayClientProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const item = items[selectedIndex];

  return (
    <div className="mx-auto w-full max-w-[min(100%,1600px)] space-y-6 px-5 py-8 lg:px-10">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/report/${reportId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Report
          </Link>
          <h1 className="mt-1 text-xl font-bold">
            Interview Replay — {role}
          </h1>
          <p className="text-sm capitalize text-muted-foreground">{difficulty} difficulty</p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
          Practice Again
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar: question list */}
        <aside className="space-y-1.5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Questions
          </p>
          {items.map((q, idx) => (
            <button
              key={q.questionId}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                idx === selectedIndex
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:border-muted hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Q{q.orderIndex + 1}
                </span>
                <Badge
                  className={`border-0 text-xs font-medium capitalize ${
                    CATEGORY_STYLES[q.category]
                  }`}
                >
                  {q.category}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm">{q.questionText}</p>
              {q.overallScore !== null && (
                <p
                  className={`mt-1.5 text-xs font-semibold ${scoreColorClass(q.overallScore)}`}
                >
                  {q.overallScore.toFixed(1)} / 10
                </p>
              )}
            </button>
          ))}
        </aside>

        {/* Main: selected question breakdown */}
        <div className="space-y-5">
          {/* Question */}
          <Card>
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Q{item.orderIndex + 1}
                </span>
                <Badge
                  className={`border-0 text-xs font-medium capitalize ${
                    CATEGORY_STYLES[item.category]
                  }`}
                >
                  {item.category}
                </Badge>
              </div>
              <p className="font-medium leading-relaxed">{item.questionText}</p>
            </CardContent>
          </Card>

          {/* Your answer */}
          <Card>
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Your Answer</p>
                {item.answerMode === 'voice' && (
                  <Badge className="border-0 bg-blue-100 text-blue-700 text-xs">
                    Voice
                  </Badge>
                )}
              </div>
              {item.answerText ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.answerText}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No answer recorded.</p>
              )}
            </CardContent>
          </Card>

          {/* Score + feedback */}
          {item.overallScore !== null && (
            <Card>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    <span className={scoreColorClass(item.overallScore)}>
                      {item.overallScore.toFixed(1)}
                    </span>
                    <span className="text-base font-normal text-muted-foreground"> / 10</span>
                  </span>
                  <span className="text-sm text-muted-foreground">Overall Score</span>
                </div>

                {item.feedbackText && (
                  <p className="text-sm text-muted-foreground">{item.feedbackText}</p>
                )}

                {/* Dimension bars */}
                {item.dimensionScores && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-medium">Dimension Breakdown</p>
                    {DIMENSIONS.map(({ key, label }) => {
                      const score = item.dimensionScores![key];
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={`font-medium ${scoreColorClass(score)}`}>
                              {score.toFixed(1)}/10
                            </span>
                          </div>
                          <Progress value={score * 10} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Model answer */}
          {item.modelAnswerHint && (
            <Card>
              <CardContent className="space-y-2 pt-5">
                <p className="text-sm font-medium">Model Answer</p>
                <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50/60 p-3 dark:bg-blue-950/20">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.modelAnswerHint}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous / Next navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
              disabled={selectedIndex === 0}
            >
              ← Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedIndex + 1} / {items.length}
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedIndex((i) => Math.min(items.length - 1, i + 1))}
              disabled={selectedIndex === items.length - 1}
            >
              Next →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
