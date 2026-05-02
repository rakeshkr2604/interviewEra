'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GeneratedQuestion } from './actions';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

function categoryBadgeStyle(category: GeneratedQuestion['category']): CSSProperties {
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

export function QuestionGeneratorResultsView({
  questions,
  showBackLink = true,
  root: RootTag = 'main',
}: {
  questions: GeneratedQuestion[];
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
              Use them for self-practice or with a peer. Category tags show what interviewers are probing.
            </p>
          </div>

          <ol className="space-y-3">
            {questions.map((q) => (
              <li key={q.order}>
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
                      {q.order}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p
                        className="text-sm leading-relaxed sm:text-[0.9375rem]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {q.question_text}
                      </p>
                      <Badge
                        className="border-0 text-xs font-medium capitalize"
                        style={categoryBadgeStyle(q.category)}
                      >
                        {q.category}
                      </Badge>
                    </div>
                  </div>
                </article>
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
