'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardCopy, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { StarResult, StarScores } from './actions';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

const SCORE_LABELS: Record<keyof StarScores, string> = {
  structure: 'Structure',
  specificity: 'Specificity',
  impact: 'Impact',
};

function scoreBarColor(score: number): string {
  if (score >= 8) return 'var(--accent-success)';
  if (score >= 6) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

function scoreTextColor(score: number): string {
  if (score >= 8) return 'var(--accent-success)';
  if (score >= 6) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

export function StarBuilderResultsView({
  result,
  notice,
  showBackLink = true,
  root: RootTag = 'main',
}: {
  result: StarResult;
  notice?: string;
  showBackLink?: boolean;
  root?: 'main' | 'section';
}) {
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (copyState === 'done') {
      const t = setTimeout(() => setCopyState('idle'), 2000);
      return () => clearTimeout(t);
    }
  }, [copyState]);

  async function copyAnswer() {
    const text = result.polishedAnswer;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('done');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopyState('done');
      } catch {
        setCopyState('error');
      }
    }
  }

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
            href="/tools/star-builder"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Build another answer
          </Link>
        )}

        <div className="mx-auto max-w-2xl space-y-5">
          {notice && (
            <p
              className="rounded-xl border-2 px-4 py-3 text-sm leading-relaxed"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                color: 'var(--text-secondary)',
              }}
              role="status"
            >
              {notice}
            </p>
          )}

          <Card
            className="overflow-hidden border-2 shadow-lg lg:rounded-3xl"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <CardContent className="space-y-4 p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Polished answer
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-2"
                    onClick={copyAnswer}
                    disabled={copyState === 'done'}
                  >
                    {copyState === 'done' ? (
                      <>
                        <Check className="size-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="size-4" />
                        Copy
                      </>
                    )}
                  </Button>
                  {copyState === 'error' && (
                    <span className="text-xs" style={{ color: 'var(--accent-danger)' }}>
                      Copy blocked — select text manually
                    </span>
                  )}
                </div>
              </div>
              <p
                className="whitespace-pre-wrap rounded-xl border-2 p-4 text-sm leading-relaxed sm:text-[0.9375rem]"
                style={{
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-primary)',
                  background: 'color-mix(in srgb, var(--bg-secondary) 40%, transparent)',
                }}
              >
                {result.polishedAnswer}
              </p>
            </CardContent>
          </Card>

          <Card
            className="overflow-hidden border-2 shadow-lg lg:rounded-3xl"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <CardContent className="space-y-5 p-6 sm:p-8">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Answer quality
              </h2>
              <div className="grid gap-5 sm:grid-cols-3">
                {(Object.keys(SCORE_LABELS) as Array<keyof StarScores>).map((key) => {
                  const score = result.scores[key];
                  const pct = Math.min(100, Math.max(0, score * 10));
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {SCORE_LABELS[key]}
                        </span>
                        <span
                          className="text-2xl font-bold tabular-nums"
                          style={{ color: scoreTextColor(score) }}
                        >
                          {score}
                          <span className="text-sm font-normal opacity-70">/10</span>
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--text-secondary) 15%, transparent)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: scoreBarColor(score),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card
            className="overflow-hidden border-2 shadow-lg lg:rounded-3xl"
            style={{
              borderColor: 'var(--card-border)',
              background: 'var(--card-bg)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <CardContent className="space-y-4 p-6 sm:p-8">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Improvement suggestions
              </h2>
              <ul className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 18%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <FreeToolCtaBlock
            title="Say this answer out loud next"
            body="Our AI mock interview listens, scores clarity, and catches filler words — same STAR story, real-time feedback."
            href="/signup"
            ctaLabel="Start free practice"
          />
        </div>
      </div>
    </RootTag>
  );
}
