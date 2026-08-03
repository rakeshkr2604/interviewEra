'use client';

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ContactRound,
  Info,
  Layers,
  LayoutTemplate,
  Target,
  XCircle,
  type LucideProps,
} from 'lucide-react';
import type {
  AtsActionItem,
  AtsJdMatch,
  AtsResultV2,
  Finding,
  FindingSeverity,
} from './ats-types';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';
import { AtsDimensionsOverview } from './AtsDimensionsOverview';
import { AtsScoreRing, scoreBand } from './AtsScoreRing';

type LucideIcon = ComponentType<LucideProps>;

const FindingIcon = ({ severity }: { severity: FindingSeverity }) => {
  const common = 'size-4 shrink-0 sm:size-5';
  if (severity === 'info') {
    return <Info className={common} style={{ color: 'var(--accent-primary)' }} aria-hidden />;
  }
  if (severity === 'warning') {
    return <AlertTriangle className={common} style={{ color: 'var(--accent-warning)' }} aria-hidden />;
  }
  return <XCircle className={common} style={{ color: 'var(--accent-danger)' }} aria-hidden />;
};

function DimensionCard({
  title,
  subtitle,
  score,
  findings,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  score: number;
  findings: Finding[];
  icon: LucideIcon;
}) {
  const band = scoreBand(score);
  const issues = findings.filter((f) => f.severity !== 'info');
  const infos = findings.filter((f) => f.severity === 'info');

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'color-mix(in srgb, ' + band.topAccent + ' 28%, var(--card-border))',
        borderTopWidth: 3,
        borderTopColor: band.topAccent,
        background: band.surface,
      }}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex items-start gap-3">
          <span
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
              color: 'var(--accent-primary)',
            }}
            aria-hidden
          >
            <Icon className="size-4 sm:size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              {title}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 sm:w-[4.75rem]">
          <AtsScoreRing score={score} size={68} />
          <p
            className="text-center text-[11px] font-semibold leading-tight sm:text-xs"
            style={{ color: band.color }}
          >
            {band.label}
          </p>
        </div>
      </div>
      {(issues.length > 0 || infos.length > 0) && (
        <ul
          className="space-y-2 border-t px-4 py-3 sm:px-5"
          style={{ borderColor: 'color-mix(in srgb, ' + band.topAccent + ' 18%, var(--card-border))' }}
        >
          {[...issues, ...infos.slice(0, 2)].map((f) => (
            <li key={f.id} className="flex gap-2.5 text-xs leading-relaxed sm:text-sm">
              <FindingIcon severity={f.severity} />
              <span style={{ color: 'var(--text-secondary)' }}>{f.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricRow({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium sm:text-sm" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {value}
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            /100
          </span>
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: 'color-mix(in srgb, var(--card-border) 70%, transparent)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: 'var(--accent-primary)',
          }}
        />
      </div>
      <p className="text-[11px] leading-snug sm:text-xs" style={{ color: 'var(--text-muted)' }}>
        {hint}
      </p>
    </div>
  );
}

function SkillChipList({
  label,
  items,
  empty,
  tone,
}: {
  label: string;
  items: string[];
  empty: string;
  tone: 'ok' | 'gap' | 'inferred';
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-1.5 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
          {empty}
        </p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {items.slice(0, 8).map((s) => (
            <span
              key={s}
              className="rounded-md border px-2 py-0.5 text-xs"
              style={{
                borderColor:
                  tone === 'gap'
                    ? 'color-mix(in srgb, var(--accent-warning) 35%, var(--card-border))'
                    : tone === 'inferred'
                      ? 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))'
                      : 'var(--card-border)',
                color:
                  tone === 'gap'
                    ? 'var(--accent-warning)'
                    : tone === 'inferred'
                      ? 'var(--accent-primary)'
                      : 'var(--text-secondary)',
                background:
                  tone === 'gap'
                    ? 'color-mix(in srgb, var(--accent-warning) 8%, transparent)'
                    : tone === 'inferred'
                      ? 'color-mix(in srgb, var(--accent-primary) 8%, transparent)'
                      : 'transparent',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact-grid summary findings for JD Match — not a duplicate of the full breakdown. */
function jdMatchCompactFindings(jd: AtsJdMatch): Finding[] {
  const findings: Finding[] = [];
  const missingReq = jd.missingRequired.length;
  if (missingReq === 1) {
    findings.push({
      id: 'jd_compact_missing_required',
      severity: 'warning',
      message: `1 required skill from this JD isn’t clearly on your resume.`,
    });
  } else if (missingReq > 1) {
    findings.push({
      id: 'jd_compact_missing_required',
      severity: missingReq >= 4 ? 'error' : 'warning',
      message: `${missingReq} required skills from this JD aren’t clearly on your resume.`,
    });
  } else {
    const topIssue = jd.findings.find((f) => f.severity !== 'info');
    if (topIssue) {
      findings.push(topIssue);
    } else if (jd.missingPreferred.length > 0) {
      findings.push({
        id: 'jd_compact_missing_preferred',
        severity: 'info',
        message:
          jd.missingPreferred.length === 1
            ? `1 preferred skill from this JD isn’t clearly covered.`
            : `${jd.missingPreferred.length} preferred skills from this JD aren’t clearly covered.`,
      });
    }
  }
  findings.push({
    id: 'jd_compact_see_below',
    severity: 'info',
    message: 'Full skill & coverage breakdown below.',
  });
  return findings;
}

/** Dedicated JD breakdown — full metrics + chips (not the compact grid peer). */
function JdMatchCard({ jd }: { jd: AtsJdMatch }) {
  const band = scoreBand(jd.score);
  const issueFindings = jd.findings.filter((f) => f.severity !== 'info');

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'color-mix(in srgb, ' + band.topAccent + ' 28%, var(--card-border))',
        borderTopWidth: 3,
        borderTopColor: band.topAccent,
        background: band.surface,
      }}
    >
      <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex items-start gap-3">
          <span
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
              color: 'var(--accent-primary)',
            }}
            aria-hidden
          >
            <Target className="size-4 sm:size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              JD language overlap
            </p>
            <p className="mt-0.5 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
              How well your resume’s language overlaps this job description — InterviewEra’s analysis, not a
              named ATS matcher. Built from exact/normalized skill coverage plus semantic relevance.
            </p>
          </div>
        </div>
        <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 sm:w-[4.75rem]">
          <AtsScoreRing score={jd.score} size={68} />
          <p
            className="text-center text-[11px] font-semibold leading-tight sm:text-xs"
            style={{ color: band.color }}
          >
            {band.label}
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t px-4 py-4 sm:px-5" style={{ borderColor: 'var(--card-border)' }}>
        <MetricRow
          label="Required skills (exact / normalized)"
          value={jd.requiredCoverage}
          hint="Share of this JD’s must-have skills that appear on your resume after alias normalization (e.g. JS→JavaScript)."
        />
        <MetricRow
          label="Preferred skills (exact / normalized)"
          value={jd.preferredCoverage}
          hint="Share of nice-to-have skills covered the same way. Lower preferred coverage pulls the overall score down even when required coverage is 100%."
        />
        <MetricRow
          label="How much of the JD your resume covers"
          value={jd.jdRequirementCoverage}
          hint="Semantic read: does your skill/role language cover what this posting asks for (not just exact strings)?"
        />
        <MetricRow
          label="How focused your resume is on this JD"
          value={jd.resumeFocusAlignment}
          hint="Semantic read: how much of your listed skills/roles look relevant to this posting vs. off-topic."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SkillChipList
            label="Matched required"
            items={jd.matchedRequired}
            empty="None matched yet"
            tone="ok"
          />
          <SkillChipList
            label="Missing required"
            items={jd.missingRequired}
            empty="No required-skill gaps"
            tone="gap"
          />
        </div>

        {jd.inferredFromExperience && jd.inferredFromExperience.length > 0 ? (
          <SkillChipList
            label="Found in experience, not in your skills list"
            items={jd.inferredFromExperience}
            empty=""
            tone="inferred"
          />
        ) : null}

        {issueFindings.length > 0 ? (
          <ul className="space-y-2">
            {issueFindings.map((f) => (
              <li key={f.id} className="flex gap-2.5 text-xs leading-relaxed sm:text-sm">
                <FindingIcon severity={f.severity} />
                <span style={{ color: 'var(--text-secondary)' }}>{f.message}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-[11px] leading-snug sm:text-xs" style={{ color: 'var(--text-muted)' }}>
          Overall = required×45% + preferred×15% + JD-covered-by-resume×25% + resume-focus-on-JD×15%. Gaps
          should be addressed honestly — don’t keyword-stuff.
        </p>
      </div>
    </div>
  );
}

function priorityAccent(priority: AtsActionItem['priority']): string {
  if (priority === 'high') return 'var(--accent-danger)';
  if (priority === 'medium') return 'var(--accent-warning)';
  // Low still on-brand — muted purple, not flat grey
  return 'var(--accent-primary)';
}

function PriorityBadge({ priority }: { priority: AtsActionItem['priority'] }) {
  const color = priorityAccent(priority);
  const label = priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low';
  return (
    <span
      className="inline-flex rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-xs"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

export function AtsResultsView({
  result,
  showBackLink = true,
  root: RootTag = 'main',
}: {
  result: AtsResultV2;
  showBackLink?: boolean;
  root?: 'main' | 'section';
}) {
  const [showJson, setShowJson] = useState(false);
  const extractedJson = JSON.stringify(result.fieldExtraction.extracted, null, 2);

  return (
    <RootTag
      className="ie-landing-type relative overflow-hidden pb-6 pt-4 sm:pb-8 sm:pt-5 md:pt-6"
      style={{
        color: 'var(--text-primary)',
        // Same page wash as marketing landing (`--page-gradient` from globals.css)
        background: 'var(--page-gradient)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-[18%] top-[-16%] h-[min(22rem,72vw)] w-[min(22rem,72vw)] rounded-full blur-[100px]"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 22%, transparent)' }}
        />
        <div
          className="absolute -right-[12%] top-[22%] h-[min(16rem,55vw)] w-[min(16rem,55vw)] rounded-full blur-[90px]"
          style={{ background: 'color-mix(in srgb, var(--v3-pur, #7c3aed) 16%, transparent)' }}
        />
      </div>

      <div className={cn('relative px-4 sm:px-6 lg:px-8', LANDING_PAGE_CONTAINER)}>
        {showBackLink && (
          <Link
            href="/tools/ats-checker"
            className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:mb-8 sm:min-h-0 sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Check another resume
          </Link>
        )}

        <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
          <header className="w-full space-y-1.5 text-center sm:space-y-2 sm:text-left">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.12em] sm:text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              InterviewEra resume readiness
            </p>
            <h1
              className="text-balance text-xl font-bold leading-[1.2] tracking-tight sm:text-3xl sm:leading-[1.12]"
              style={{ color: 'var(--text-primary)' }}
            >
              What a typical parser extracts — and where it struggles
            </h1>
            <p
              className="mx-auto max-w-2xl text-pretty text-sm leading-snug sm:mx-0 sm:max-w-3xl sm:text-[15px] sm:leading-[1.45]"
              style={{ color: 'var(--text-secondary)' }}
            >
              These are InterviewEra’s own readiness dimensions — not a score from Workday, Greenhouse, or any named
              ATS. Real systems parse fields and search keywords; they do not show candidates a universal 0–100 “ATS
              score.”
            </p>
          </header>

          <AtsDimensionsOverview result={result} />

          <div className="grid gap-4 md:grid-cols-2">
            <DimensionCard
              title="Parseability"
              subtitle="Layout & text-layer risks (rule-based)"
              score={result.parseability.score}
              findings={result.parseability.findings}
              icon={LayoutTemplate}
            />
            <DimensionCard
              title="Field extraction"
              subtitle="How completely contact & sections were recovered"
              score={result.fieldExtraction.score}
              findings={result.fieldExtraction.missingFields.map((f) => ({
                id: `missing_${f}`,
                severity: 'warning' as const,
                message: `Missing or not found: ${f}`,
              }))}
              icon={ContactRound}
            />
            <DimensionCard
              title="Structure quality"
              subtitle="Sections, chronology, and length (rule-based)"
              score={result.structureQuality.score}
              findings={result.structureQuality.findings}
              icon={Layers}
            />
            {result.jdMatch ? (
              <DimensionCard
                title="JD language overlap"
                subtitle="Resume ↔ this job description (InterviewEra analysis)"
                score={result.jdMatch.score}
                findings={jdMatchCompactFindings(result.jdMatch)}
                icon={Target}
              />
            ) : null}
          </div>

          {result.jdMatch ? <JdMatchCard jd={result.jdMatch} /> : null}

          {result.fieldExtraction.extractionDegraded ? (
            <div
              className="flex gap-3 rounded-2xl border px-4 py-3.5"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-warning) 28%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-warning) 8%, transparent)',
              }}
            >
              <AlertTriangle className="size-5 shrink-0" style={{ color: 'var(--accent-warning)' }} aria-hidden />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Structured extraction could not be validated for this file. Scores below treat fields as missing —
                try a cleaner text-based PDF.
              </p>
            </div>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                  What a typical parser extracts
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                  Structured fields recovered from your file — not attributed to any named platform.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)] sm:text-sm"
                style={{ borderColor: 'var(--card-border)', color: 'var(--accent-primary)' }}
              >
                {showJson ? 'Hide' : 'Show'} JSON
                <ChevronDown
                  className={cn('size-4 transition-transform', showJson && 'rotate-180')}
                  aria-hidden
                />
              </button>
            </div>

            <div
              className="rounded-2xl border px-4 py-4 sm:px-5"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              }}
            >
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {(
                  [
                    ['Name', result.fieldExtraction.extracted.name],
                    ['Email', result.fieldExtraction.extracted.email],
                    ['Phone', result.fieldExtraction.extracted.phone],
                    ['Location', result.fieldExtraction.extracted.location],
                    ['LinkedIn', result.fieldExtraction.extracted.linkedin],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {label}
                    </dt>
                    <dd className="mt-0.5 break-words" style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {value ?? '— not found —'}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Experience ({result.fieldExtraction.extracted.experience.length})
                  </p>
                  <ul className="mt-2 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {result.fieldExtraction.extracted.experience.length === 0 ? (
                      <li>— none extracted —</li>
                    ) : (
                      result.fieldExtraction.extracted.experience.slice(0, 6).map((e, i) => (
                        <li key={i}>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {[e.title, e.company].filter(Boolean).join(' · ') || 'Role'}
                          </span>
                          {(e.startDate || e.endDate) && (
                            <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                              {[e.startDate, e.endDate].filter(Boolean).join(' – ')}
                            </span>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Education ({result.fieldExtraction.extracted.education.length})
                  </p>
                  <ul className="mt-2 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {result.fieldExtraction.extracted.education.length === 0 ? (
                      <li>— none extracted —</li>
                    ) : (
                      result.fieldExtraction.extracted.education.slice(0, 4).map((e, i) => (
                        <li key={i}>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {[e.degree, e.institution].filter(Boolean).join(' · ') || 'Education'}
                          </span>
                          {e.year ? (
                            <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                              {e.year}
                            </span>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Skills
                </p>
                {result.fieldExtraction.extracted.skills.length === 0 ? (
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    — none extracted —
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.fieldExtraction.extracted.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-md border px-2 py-0.5 text-xs"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {showJson ? (
                <pre
                  className="mt-4 max-h-72 overflow-auto rounded-xl border p-3 text-left text-[11px] leading-relaxed sm:text-xs"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {extractedJson}
                </pre>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                Ranked fixes
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Derived from the checks above — not free-form AI advice.
              </p>
              {result.actionItems.some((i) => typeof i.pointsEstimate === 'number') ? (
                <p className="mt-1 text-[11px] leading-snug sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                  Point estimates are approximate and additive within each category.
                </p>
              ) : null}
            </div>
            {result.actionItems.length === 0 ? (
              <div
                className="flex gap-3 rounded-2xl border px-4 py-3.5"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-success) 28%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-success) 8%, var(--card-bg))',
                }}
              >
                <CheckCircle2 className="size-5 shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No high-priority structural fixes from this run. Still review the extracted fields for accuracy.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {result.actionItems.map((item, idx) => {
                  const accent = priorityAccent(item.priority);
                  return (
                    <li
                      key={`${item.priority}-${idx}`}
                      className="rounded-2xl border py-3.5 pl-5 pr-4 sm:py-4 sm:pl-6 sm:pr-5"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-primary) 18%, var(--card-border))',
                        borderLeftWidth: 4,
                        borderLeftColor: accent,
                        background: `color-mix(in srgb, ${accent} 6%, var(--card-bg))`,
                        boxShadow: '0 1px 0 color-mix(in srgb, var(--accent-primary) 6%, transparent)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={item.priority} />
                      </div>
                      <p className="mt-2 text-sm font-medium sm:text-base" style={{ color: 'var(--text-primary)' }}>
                        {item.text}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {item.expectedImpact}
                      </p>
                      {typeof item.pointsEstimate === 'number' && item.pointsEstimate > 0 ? (
                        <p className="mt-1 text-xs font-medium sm:text-sm" style={{ color: accent }}>
                          Fixing this could recover ~{item.pointsEstimate} points.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

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
