import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatDateTimeEnIn } from '@/lib/datetime/ist';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { generateMetadata as buildPageMetadata } from '@/lib/seo/metadata';
import { ReportPanel } from '@/components/report/ReportPanel';
import { BlurredSection } from '@/components/report/BlurredSection';
import { ScriptReportPerQuestion } from '@/components/report/ScriptReportPerQuestion';
import { ScriptReportGeneratingRefresh } from '@/components/interview/ScriptReportGeneratingRefresh';
import { ScriptRadarChart } from '@/components/report/ReportDynamicCharts';
import { loadOrGenerateScriptReport } from '@/lib/interview/script-report/generate';
import {
  INSUFFICIENT_DATA_COPY,
  MIN_SCORED_ANSWERS_FOR_FULL_REPORT,
  PLACEMENT_SIGNAL_DISCLAIMER,
  dimensionLabel,
  limitedDataCopy,
  placementSignalLabel,
  scoreBandLabel,
  type PlacementSignal,
  type ScoreBand,
} from '@/lib/interview/script-report/aggregate';
import {
  canExportScriptReportPdf,
  canSeeScriptReportDetails,
  canSeeScriptReportPro,
} from '@/lib/interview/script-report/access';
import {
  buildScriptSpeechSummary,
  formatSpeechDurationLabel,
} from '@/lib/interview/script-report/speech';
import {
  dimensionSignalRows,
  hiringSignalBadgeLabel,
  readinessBadgeLabel,
  sessionHiringSignal,
  sessionReadiness,
  strongestWeakestLabels,
} from '@/lib/interview/script-report/recruiter-view';
import type { DimensionKey } from '@/lib/interview/answer-score/rubric';
import type { ScriptReportSynthesis } from '@/lib/interview/script-report/synthesis';
import type { PlanTier, SignalStrength } from '@/types/app.types';

/** Avoid soft-nav caching a prior failed payload while generate-on-view runs. */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    title: 'Interview report',
    description: 'Score-v1.2 session report for your completed mock interview.',
    path: `/report/script/${id}`,
    noIndex: true,
  });
}

const exportPdfLinkClass =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[var(--ie-radius-md)] border-2 px-3 text-sm font-semibold whitespace-nowrap transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]';

const exportPdfLinkStyle: CSSProperties = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
  color: 'var(--text-primary)',
};

function scoreColor(score: number): string {
  if (score >= 7) return 'var(--accent-success)';
  if (score >= 5) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

function polarityStyle(polarity: 'strength' | 'watch' | 'gap'): CSSProperties {
  if (polarity === 'strength') {
    return {
      borderColor: 'color-mix(in srgb, var(--accent-success) 40%, var(--card-border))',
      background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
    };
  }
  if (polarity === 'gap') {
    return {
      borderColor: 'color-mix(in srgb, var(--accent-danger) 40%, var(--card-border))',
      background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
    };
  }
  return {
    borderColor: 'color-mix(in srgb, var(--accent-warning) 40%, var(--card-border))',
    background: 'color-mix(in srgb, var(--accent-warning) 8%, transparent)',
  };
}

function signalPillStyle(strength: SignalStrength): { background: string; color: string } {
  if (strength === 'strong') {
    return {
      background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)',
      color: 'var(--accent-success)',
    };
  }
  if (strength === 'moderate') {
    return {
      background: 'color-mix(in srgb, var(--accent-warning) 18%, transparent)',
      color: 'var(--text-primary)',
    };
  }
  return {
    background: 'color-mix(in srgb, var(--accent-danger) 14%, transparent)',
    color: 'var(--accent-danger)',
  };
}

function asSynthesis(raw: unknown): ScriptReportSynthesis | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as ScriptReportSynthesis;
  if (
    typeof s.recruiter_assessment !== 'string' ||
    !Array.isArray(s.hiring_signals) ||
    !Array.isArray(s.roadmap_30_day)
  ) {
    return null;
  }
  return s;
}

function ReportUnavailable(props: {
  title: string;
  body: string;
  interviewId?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <DashboardPageHeader
        eyebrow="v2.1 report"
        title="Interview report"
        subtitle="score-v1.2 session feedback"
        backHref="/history"
        backLabel="Interview history"
      />
      <section className="dashboard-premium-card px-6 py-8 sm:px-7">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {props.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {props.body}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/history"
            className="inline-flex h-9 items-center rounded-[var(--ie-radius-md)] border-2 px-3 text-sm font-semibold"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
          >
            Back to history
          </Link>
          {props.interviewId ? (
            <Link
              href={`/interview/script/${props.interviewId}`}
              className="inline-flex h-9 items-center rounded-[var(--ie-radius-md)] px-3 text-sm font-semibold text-white"
              style={{ background: 'var(--accent-primary)' }}
            >
              Open interview
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default async function ScriptReportPage({ params }: PageProps) {
  const { id: interviewId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const serviceClient = createServiceClient();
  const [{ data: profile }, result] = await Promise.all([
    serviceClient.from('users').select('plan_tier').eq('id', user.id).single(),
    loadOrGenerateScriptReport({
      serviceClient,
      interviewId,
      userId: user.id,
    }),
  ]);

  if (!result.ok) {
    console.error('[script-report-page] load failed', {
      interviewId,
      userId: user.id,
      status: result.status,
      error: result.error,
    });
    if (result.status === 409) {
      redirect(`/interview/script/${interviewId}`);
    }
    if (result.status === 404) {
      return (
        <ReportUnavailable
          title="Report not found"
          body="This interview was not found as a completed v2.1 script session for your account. If you just finished, wait a moment and open the report again from History."
          interviewId={interviewId}
        />
      );
    }
    return (
      <ReportUnavailable
        title="Could not load report"
        body={result.error || 'Something went wrong while loading this report. Try again from History.'}
        interviewId={interviewId}
      />
    );
  }

  const planTier = (profile?.plan_tier ?? 'free') as PlanTier;
  const seeDetails = canSeeScriptReportDetails(planTier);
  const seePro = canSeeScriptReportPro(planTier);
  const canPdf = canExportScriptReportPdf(planTier);

  const { data: interview } = await serviceClient
    .from('interviews')
    .select('role, script_type, completed_at, created_at')
    .eq('id', interviewId)
    .maybeSingle<{
      role: string | null;
      script_type: string | null;
      completed_at: string | null;
      created_at: string;
    }>();

  const report = result.report;
  const synthesis = asSynthesis(report.synthesis);
  const completedLabel = formatDateTimeEnIn(interview?.completed_at ?? report.generated_at);
  const promptVersions =
    report.prompt_versions?.length > 0 ? report.prompt_versions.join(', ') : 'unknown';
  const limitedData =
    report.scored_answer_count > 0 &&
    report.scored_answer_count < MIN_SCORED_ANSWERS_FOR_FULL_REPORT;

  const headerAction = canPdf ? (
    <a
      href={`/api/report/script/export-pdf?interviewId=${interviewId}`}
      download
      className={exportPdfLinkClass}
      style={exportPdfLinkStyle}
    >
      Export PDF
    </a>
  ) : (
    <div className="flex items-center gap-2">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Export PDF
      </span>
      <span
        className="rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{
          background: 'color-mix(in srgb, var(--accent-warning) 22%, transparent)',
          color: 'var(--accent-warning)',
        }}
      >
        Pro
      </span>
    </div>
  );

  const header = (
    <DashboardPageHeader
      eyebrow="v2.1 report"
      title="Interview report"
      subtitle={
        interview?.role
          ? `${interview.role} · score-v1.2 session feedback`
          : 'score-v1.2 session feedback'
      }
      backHref="/history"
      backLabel="Interview history"
      action={headerAction}
    />
  );

  if (report.status === 'generating') {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {header}
        <ScriptReportGeneratingRefresh />
      </div>
    );
  }

  if (report.status === 'insufficient_data' || report.scored_answer_count === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {header}
        <section
          className="dashboard-premium-card px-6 py-8 sm:px-7"
          data-testid="script-report-insufficient-data"
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--accent-primary)' }}
          >
            Report unavailable
          </p>
          <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Not enough data to generate a report
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {INSUFFICIENT_DATA_COPY}
          </p>
          <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            Completed: {completedLabel} · Scored answers: 0
          </p>
        </section>
      </div>
    );
  }

  if (report.status === 'failed' || report.overall == null || !report.dimension_averages) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {header}
        <section
          className="dashboard-premium-card px-6 py-8 sm:px-7"
          role="alert"
          data-testid="script-report-failed"
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--accent-danger)' }}
          >
            Generation failed
          </p>
          <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Report could not be generated
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Something went wrong while assembling your report. Check{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Interview History
            </span>{' '}
            in a moment, or contact support if this keeps happening.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/history"
              className="inline-flex h-9 items-center rounded-[var(--ie-radius-md)] px-3 text-sm font-semibold text-white"
              style={{ background: 'var(--accent-primary)' }}
            >
              Interview History
            </Link>
            <Link
              href={`/report/script/${interviewId}`}
              className="inline-flex h-9 items-center rounded-[var(--ie-radius-md)] border-2 px-3 text-sm font-semibold"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            >
              Try again
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const overall = Number(report.overall);
  const dims = report.dimension_averages;
  const band = report.score_band as ScoreBand;
  const signal = report.placement_signal as PlacementSignal;
  const hireSignal = sessionHiringSignal(band);
  const readiness = sessionReadiness(signal);
  const { strongest, weakest } = strongestWeakestLabels(dims);
  const dimSignals = dimensionSignalRows(dims);
  const speechSummary = buildScriptSpeechSummary(
    report.per_question.map((q) => ({ transcript: q.transcript })),
  );
  const sessionDurationLabel = speechSummary
    ? formatSpeechDurationLabel(speechSummary.total_duration_seconds)
    : null;

  const hireStyle =
    hireSignal === 'hire'
      ? {
          background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)',
          color: 'var(--accent-success)',
        }
      : hireSignal === 'borderline'
        ? {
            background: 'color-mix(in srgb, var(--accent-warning) 18%, transparent)',
            color: 'var(--text-primary)',
          }
        : {
            background: 'color-mix(in srgb, var(--accent-danger) 14%, transparent)',
            color: 'var(--accent-danger)',
          };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {header}

      {limitedData && (
        <div
          className="rounded-xl border-2 px-4 py-3 text-sm"
          data-testid="script-report-limited-data"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-warning) 45%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
            color: 'var(--text-secondary)',
          }}
        >
          {limitedDataCopy(report.scored_answer_count)}
        </div>
      )}

      {/* 1. Recruiter assessment — top (screenshot 3) */}
      <ReportPanel
        id="recruiter-assessment"
        eyebrow="Recruiter assessment"
        title="Candidate intelligence"
        contentClassName="space-y-5"
      >
        <BlurredSection
          userTier={planTier}
          requiredTier="starter"
          upgradeLabel="Upgrade to Starter to unlock recruiter assessment"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={hireStyle}
            >
              {hiringSignalBadgeLabel(hireSignal)}
            </span>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              {readinessBadgeLabel(readiness)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Role fit confidence:{' '}
              <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {overall.toFixed(1)}/10
              </span>
            </span>
          </div>

          {synthesis ? (
            <blockquote
              className="max-w-3xl border-l-2 pl-4 text-sm leading-relaxed sm:text-[15px]"
              data-testid="script-report-assessment"
              style={{ borderColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
            >
              &ldquo;{synthesis.recruiter_assessment}&rdquo;
            </blockquote>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {scoreBandLabel(band)} · {placementSignalLabel(signal)}
            </p>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              Strongest:{' '}
              <span className="font-semibold" style={{ color: 'var(--accent-success)' }}>
                {strongest}
              </span>
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Weakest:{' '}
              <span className="font-semibold" style={{ color: 'var(--accent-danger)' }}>
                {weakest}
              </span>
            </span>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {PLACEMENT_SIGNAL_DISCLAIMER}
          </p>

          <div className="border-t pt-5" style={{ borderColor: 'var(--card-border)' }}>
            <p
              className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Hiring signals
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {dimSignals.map((row) => {
                const style = signalPillStyle(row.strength);
                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm"
                    style={{
                      background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                      border: '1.5px solid var(--card-border)',
                    }}
                  >
                    <span className="min-w-0 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                      {row.label}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize sm:text-[11px]"
                      style={style}
                    >
                      {row.strength}
                    </span>
                  </div>
                );
              })}
            </div>
            {synthesis && synthesis.hiring_signals.length > 0 && (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {synthesis.hiring_signals.map((signalItem, i) => (
                  <li
                    key={`${signalItem.label}-${i}`}
                    className="rounded-xl border-2 p-4"
                    style={polarityStyle(signalItem.polarity)}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {signalItem.label}
                    </p>
                    <p
                      className="mt-1 text-sm leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {signalItem.detail}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </BlurredSection>
      </ReportPanel>

      {/* 2. Score + radar (screenshot 2) */}
      <section
        aria-label="Performance overview"
        className="grid gap-4 lg:grid-cols-12 lg:gap-5"
        data-testid="script-report-scores"
      >
        <div className="dashboard-premium-card px-6 py-5 sm:px-7 sm:py-6 lg:col-span-5">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--accent-primary)' }}
          >
            Summary · Overall score
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="text-5xl font-bold tabular-nums leading-none sm:text-6xl"
              data-testid="script-report-overall"
              style={{ color: scoreColor(overall) }}
            >
              {overall.toFixed(1)}
            </span>
            <span className="text-lg" style={{ color: 'var(--text-muted)' }}>
              / 10
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {scoreBandLabel(band)}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {placementSignalLabel(signal)}
          </p>
          <dl className="mt-4 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div>
              <dt className="inline font-medium" style={{ color: 'var(--text-primary)' }}>
                Completed:{' '}
              </dt>
              <dd className="inline">{completedLabel}</dd>
            </div>
            <div>
              <dt className="inline font-medium" style={{ color: 'var(--text-primary)' }}>
                Scored answers:{' '}
              </dt>
              <dd className="inline" data-testid="script-report-scored-count">
                {report.scored_answer_count}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium" style={{ color: 'var(--text-primary)' }}>
                Rubric version:{' '}
              </dt>
              <dd className="inline">{promptVersions}</dd>
            </div>
          </dl>
        </div>

        <ReportPanel
          id="dimension-breakdown"
          className="lg:col-span-7"
          eyebrow="Performance"
          title="Dimension breakdown"
          contentClassName="min-h-[220px] sm:min-h-[260px]"
        >
          <ScriptRadarChart dimensionAverages={dims} />
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Five score-v1.2 dimensions only. Confidence is excluded — no reliable delivery signal from
            transcript alone.
          </p>
        </ReportPanel>
      </section>

      {/* 3. Speech patterns (screenshot 4) */}
      <ReportPanel id="speech-patterns" eyebrow="Delivery" title="Speech patterns" contentClassName="space-y-5">
        <p className="max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Filler word analysis from your answer transcripts. Industry benchmark: fewer than 3 filler
          words per minute. Duration is estimated from speaking rate (v2.1 does not store mic timing
          yet).
        </p>
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {[
            {
              label: 'Filler Words',
              value: speechSummary ? String(speechSummary.total_filler_count) : '—',
              hint: speechSummary ? `${speechSummary.percentage}% of words` : 'Unavailable',
            },
            {
              label: 'Rate / min',
              value: speechSummary ? String(speechSummary.rate_per_minute) : '—',
              hint: 'Benchmark: <3',
            },
            {
              label: 'Pattern',
              value: speechSummary
                ? speechSummary.severity.charAt(0).toUpperCase() + speechSummary.severity.slice(1)
                : '—',
              hint: 'Safe / Warning / Severe',
            },
            {
              label: 'Duration',
              value: sessionDurationLabel ?? '—',
              hint: speechSummary ? 'Estimated speaking time' : 'Unavailable',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border-2 px-3 py-4 sm:px-4"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 75%, transparent)',
              }}
            >
              <p className="text-xl font-bold tabular-nums sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
                {item.value}
              </p>
              <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {item.label}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                {item.hint}
              </p>
            </div>
          ))}
        </div>

        {speechSummary && speechSummary.top_fillers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Top fillers:
            </span>
            {speechSummary.top_fillers.slice(0, 5).map(({ word, occurrences }) => (
              <span
                key={word}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums"
                style={{
                  background: 'color-mix(in srgb, var(--accent-warning) 18%, transparent)',
                  color: 'var(--text-primary)',
                }}
              >
                {word} ×{occurrences}
              </span>
            ))}
          </div>
        )}

        {speechSummary ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {speechSummary.message} · Transcript-estimated (not live mic metrics)
          </p>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Speech data not available for this report.
          </p>
        )}
      </ReportPanel>

      {/* 4. Detailed synthesis — Starter+ */}
      {synthesis && seeDetails && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <ReportPanel eyebrow="Behavioral" title="Behavioral intelligence">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {synthesis.behavioral_intelligence}
              </p>
            </ReportPanel>
            <ReportPanel eyebrow="Communication" title="Communication intelligence">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {synthesis.communication_intelligence}
              </p>
            </ReportPanel>
            <ReportPanel eyebrow="Technical" title="Technical intelligence">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {synthesis.technical_intelligence}
              </p>
            </ReportPanel>
          </div>

          <ReportPanel eyebrow="30-day roadmap" title="Practice plan from your weakest dimensions">
            <ol className="space-y-4">
              {synthesis.roadmap_30_day.map((week) => (
                <li
                  key={week.week}
                  className="rounded-xl border-2 p-4"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Week {week.week}: {week.title}
                  </p>
                  <p
                    className="mt-1 text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Focus · {dimensionLabel(week.focus_dimension as DimensionKey)}
                  </p>
                  <ul
                    className="mt-2 list-disc space-y-1 pl-5 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {week.actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </ReportPanel>
        </>
      )}

      {!seeDetails && (
        <BlurredSection
          userTier={planTier}
          requiredTier="starter"
          upgradeLabel="Upgrade to Starter for full AI feedback, hiring detail, and your 30-day roadmap"
        >
          <div className="h-40" />
        </BlurredSection>
      )}

      {/* 5. Per-question — cores + nested adaptive follow-ups; notes Starter+; model answers Pro */}
      <ReportPanel eyebrow="Per-question analysis" title="Answers, scores, and model examples">
        <ScriptReportPerQuestion
          perQuestion={report.per_question}
          planTier={planTier}
          seeDetails={seeDetails}
          seePro={seePro}
        />
      </ReportPanel>
    </div>
  );
}
