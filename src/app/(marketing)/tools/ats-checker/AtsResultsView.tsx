'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { AtsIssueType, AtsResult } from './ats-types';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

const IssueIcon = ({ type }: { type: AtsIssueType }) => {
  const common = 'size-5 shrink-0 sm:size-6';
  if (type === 'success') {
    return <CheckCircle2 className={common} style={{ color: 'var(--accent-success)' }} aria-hidden />;
  }
  if (type === 'warning') {
    return <AlertTriangle className={common} style={{ color: 'var(--accent-warning)' }} aria-hidden />;
  }
  return <XCircle className={common} style={{ color: 'var(--accent-danger)' }} aria-hidden />;
};

const scoreTone = (score: number) => {
  if (score >= 75) return { color: 'var(--accent-success)', label: 'ATS-friendly' };
  if (score >= 50) return { color: 'var(--accent-warning)', label: 'Needs improvement' };
  return { color: 'var(--accent-danger)', label: 'High risk' };
};

export function AtsResultsView({
  result,
  showBackLink = true,
  /** Use `section` when embedded under another `<main>` (e.g. storage fallback). */
  root: RootTag = 'main',
}: {
  result: AtsResult;
  showBackLink?: boolean;
  root?: 'main' | 'section';
}) {
  const tone = scoreTone(result.score);

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
            href="/tools/ats-checker"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Check another resume
          </Link>
        )}

        <div className="mx-auto max-w-2xl space-y-8">
          <div
            className="overflow-hidden rounded-[22px] border-2 shadow-xl lg:rounded-3xl"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
              background: 'color-mix(in srgb, var(--card-bg) 96%, transparent)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div className="px-5 py-8 text-center sm:px-8 sm:py-10">
              <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                ATS compatibility score
              </p>
              <p className="mt-3 text-5xl font-bold tabular-nums sm:text-6xl md:text-7xl" style={{ color: tone.color }}>
                {result.score}
                <span className="text-2xl font-semibold sm:text-3xl md:text-4xl" style={{ color: 'var(--text-secondary)' }}>
                  /100
                </span>
              </p>
              <p className="mt-2 text-sm font-semibold capitalize sm:text-base" style={{ color: tone.color }}>
                {tone.label}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {result.issues.map((issue, idx) => (
              <div
                key={`${issue.type}-${idx}`}
                className="flex gap-3.5 rounded-2xl border px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4"
                style={{
                  borderColor:
                    issue.type === 'error'
                      ? 'color-mix(in srgb, var(--accent-danger) 28%, var(--card-border))'
                      : issue.type === 'warning'
                        ? 'color-mix(in srgb, var(--accent-warning) 28%, var(--card-border))'
                        : 'var(--card-border)',
                  background:
                    issue.type === 'error'
                      ? 'color-mix(in srgb, var(--accent-danger) 6%, transparent)'
                      : issue.type === 'warning'
                        ? 'color-mix(in srgb, var(--accent-warning) 6%, transparent)'
                        : 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                }}
              >
                <IssueIcon type={issue.type} />
                <p className="min-w-0 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                  {issue.text}
                </p>
              </div>
            ))}
          </div>

          <div
            className="relative overflow-hidden rounded-[22px] border-2 p-6 text-center sm:p-8"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
              background:
                'linear-gradient(145deg, color-mix(in srgb, var(--accent-primary) 18%, var(--card-bg)) 0%, var(--card-bg) 55%)',
              boxShadow: 'var(--card-shadow), 0 0 48px color-mix(in srgb, var(--accent-primary) 14%, transparent)',
            }}
          >
            <p className="text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
              Practice answering questions from your resume
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Upload once in InterviewEra, get AI panel questions, STAR coaching, and rubric scores — free to start.
            </p>
            <Link
              href="/signup"
              className="landing-cta-lift mt-6 inline-flex h-11 items-center justify-center rounded-[12px] px-6 text-sm font-semibold text-white sm:h-12 sm:px-8 sm:text-base"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
                boxShadow: '0 12px 36px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
              }}
            >
              Start practicing free
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </RootTag>
  );
}
