'use client';

import type { CSSProperties } from 'react';
import { StartFreeCtaLink } from '@/components/analytics/StartFreeCtaLink';
import { T, Reveal } from '@/components/landing/landing-home-shared';
import {
  REPORT_DEMO,
  SCORING_ENGINE_SECTION,
} from '@/components/landing/LandingScoringEngine.data';
import { LANDING_DEMO_DISCLOSURE } from '@/lib/landing/demo-disclosure';
import { cn } from '@/lib/utils';
/** Co-located with this dynamically imported island — keeps ~14KB off the marketing critical CSS (Loop 18). */
import './LandingScoringEngine.css';

const blockLabelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: T.text,
  marginBottom: '8px',
  letterSpacing: '-0.01em',
};

const secondaryBlockLabelStyle: CSSProperties = {
  ...blockLabelStyle,
  color: T.text2,
  fontWeight: 500,
};

type DimensionBar = typeof REPORT_DEMO.evaluationDimensions[number];

function BulletItem({
  children,
  variant = 'strength',
}: {
  children: string;
  variant?: 'strength' | 'improvement';
}) {
  const isImprovement = variant === 'improvement';

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        fontSize: '13px',
        lineHeight: 1.45,
        color: T.text2,
      }}
    >
      <span
        style={{
          color: isImprovement ? T.warn : T.ok,
          fontWeight: 700,
          flexShrink: 0,
          fontSize: '12px',
        }}
        aria-hidden
      >
        {isImprovement ? '△' : '✓'}
      </span>
      <span>{children}</span>
    </li>
  );
}

function DimensionRow({ bar }: { bar: DimensionBar }) {
  const isHigh = bar.val >= 7.5;
  const barColor = isHigh ? T.ok : T.warn;

  return (
    <div className="ie-scoring-dim-row">
      <div className="ie-scoring-dim-row__name">{bar.name}</div>
      <div
        className="ie-scoring-dim-row__track"
        role="progressbar"
        aria-valuenow={bar.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${bar.name}: ${bar.val} out of 10`}
      >
        <div
          className="v3-bar-fill-solid ie-scoring-dim-row__fill"
          style={{ width: `${bar.pct}%`, background: barColor }}
        />
      </div>
      <p className="ie-scoring-dim-hint">{bar.hint}</p>
      <div className="ie-scoring-dim-row__score-line">
        <span className="ie-scoring-dim-row__value">
          {bar.val} <span className="ie-scoring-dim-row__score-unit">/ 10</span>
        </span>
      </div>
    </div>
  );
}

function PerformanceBreakdown() {
  const { evaluationDimensions, labels, highestImpactImprovement } = REPORT_DEMO;

  return (
    <div className="ie-scoring-report-dims">
      <div
        className="ie-scoring-block-label ie-scoring-dims-label"
        style={secondaryBlockLabelStyle}
      >
        {labels.performanceBreakdown}
      </div>
      <div className="ie-scoring-dim-list">
        {evaluationDimensions.map((bar) => (
          <DimensionRow key={bar.name} bar={bar} />
        ))}
      </div>
      <div className="ie-scoring-dims-coaching">
        <p className="ie-scoring-improvement-next-step">
          <span className="ie-scoring-improvement-next-step-label">Next step: </span>
          {highestImpactImprovement.nextStep}
        </p>
        <div className="ie-scoring-why-score-card">
          <p className="ie-scoring-why-score-heading">
            {labels.whyThisScore}
            <span className="ie-scoring-why-score-dimension">
              · {highestImpactImprovement.dimension}
            </span>
          </p>
          <p className="ie-scoring-why-score-note">{highestImpactImprovement.whyScoreNote}</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingScoringEngine() {
  const {
    session,
    overallOutcome,
    labels,
    highestImpactImprovement,
    strengths,
    nextImprovements,
    overallFeedback,
    cta,
  } = REPORT_DEMO;

  return (
    <section
      className={cn(
        'landing-scoring-engine',
        'px-4 py-14 sm:px-6 sm:py-20 md:px-10 lg:px-16 xl:px-[100px] lg:py-24',
      )}
      id="interview-report"
      style={{ background: 'color-mix(in srgb, var(--bg-secondary) 55%, transparent)' }}
      aria-labelledby="scoring-engine-heading"
    >
      <div className="w-full">
        <Reveal>
          <div className="ie-scoring-engine-header mx-auto max-w-3xl text-center">
            <span
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: T.acc2,
                marginBottom: '14px',
              }}
            >
              {SCORING_ENGINE_SECTION.eyebrow}
            </span>
            <h2
              id="scoring-engine-heading"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 'clamp(26px,3.4vw,42px)',
                fontWeight: 800,
                marginBottom: '18px',
                color: T.text,
                letterSpacing: '-0.028em',
                lineHeight: 1.06,
              }}
            >
              {SCORING_ENGINE_SECTION.heading}
            </h2>
            <p
              style={{
                fontSize: '16px',
                lineHeight: 1.75,
                color: T.text2,
                maxWidth: '36rem',
                margin: '0 auto',
              }}
            >
              {SCORING_ENGINE_SECTION.subheading}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div
            className="ie-scoring-report-card"
            style={{ background: T.card, border: `1px solid ${T.bord2}` }}
          >
            <header className="ie-scoring-report-card-header">
              <div className="ie-scoring-header-line">
                <div className="ie-scoring-header-session">
                  <div className="ie-scoring-session-title">{session.title}</div>
                  <p className="ie-scoring-session-meta">{session.roleLine}</p>
                </div>
                <div className="ie-scoring-header-center">
                  <ul className="ie-scoring-session-stats" aria-label="Session details">
                    {session.stats.map((stat) => (
                      <li key={stat.label}>
                        <span
                          className={cn(
                            'ie-scoring-session-stat-dot',
                            `ie-scoring-session-stat-dot--${stat.kind}`,
                          )}
                          aria-hidden
                        />
                        {stat.label}
                      </li>
                    ))}
                  </ul>
                  <div className="ie-scoring-overall-score">
                    <span className="ie-scoring-overall-score-label">
                      {overallOutcome.scoreLabel}
                    </span>
                    <span className="ie-scoring-overall-score-value">
                      {overallOutcome.score}
                      <span className="ie-scoring-overall-score-unit"> / 10</span>
                    </span>
                  </div>
                </div>
                <div className="ie-scoring-header-outcome">
                  <div className="ie-scoring-status-block">
                    <span className="ie-scoring-status-label">{overallOutcome.statusLabel}</span>
                    <span className="ie-scoring-status-pill">
                      <span className="ie-scoring-status-dot" aria-hidden />
                      {overallOutcome.label}
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <div className="ie-scoring-report-body">
              <div className="ie-scoring-report-feedback">
                <div className="ie-scoring-report-improvement ie-scoring-report-improvement--hero">
                  <div className="ie-scoring-improvement-label">{labels.biggestImprovement}</div>
                  <div className="ie-scoring-improvement-dimension">
                    {highestImpactImprovement.dimension}
                  </div>
                  <p className="ie-scoring-improvement-tip">{highestImpactImprovement.tip}</p>
                  <div className="ie-scoring-improvement-why">
                    <span className="ie-scoring-improvement-why-label">{labels.why}</span>
                    {highestImpactImprovement.whyLines.map((line) => (
                      <p key={line} className="ie-scoring-improvement-why-text">{line}</p>
                    ))}
                  </div>
                </div>

                <div className="ie-scoring-overall-feedback-block">
                  <div className="ie-scoring-block-label" style={secondaryBlockLabelStyle}>
                    {labels.overallFeedback}
                  </div>
                  <div className="ie-scoring-overall-notes">
                    {overallFeedback.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>

                <div className="ie-scoring-report-feedback-content">
                  <div className="ie-scoring-strengths-block">
                    <div className="ie-scoring-block-label" style={secondaryBlockLabelStyle}>
                      {labels.strengths}
                    </div>
                    <ul className="ie-scoring-bullet-list">
                      {strengths.map((item) => (
                        <BulletItem key={item}>{item}</BulletItem>
                      ))}
                    </ul>
                  </div>

                  <div className="ie-scoring-improve-block">
                    <div className="ie-scoring-block-label" style={secondaryBlockLabelStyle}>
                      {labels.areasToImprove}
                    </div>
                    <ul className="ie-scoring-bullet-list">
                      {nextImprovements.map((item) => (
                        <BulletItem key={item} variant="improvement">{item}</BulletItem>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="ie-scoring-report-dims-wrap">
                <PerformanceBreakdown />
              </div>
            </div>

            <p className="ie-lh-text-muted mx-auto mt-6 max-w-5xl px-1 text-center text-xs">
              {LANDING_DEMO_DISCLOSURE}
            </p>

            <div className="ie-scoring-report-footer">
              <div className="ie-scoring-cta-panel">
                <div className="ie-scoring-cta-content">
                  <p className="ie-scoring-cta-heading">{cta.heading}</p>
                  <p className="ie-scoring-cta-subheading">{cta.subheading}</p>
                </div>
                <div className="ie-scoring-cta-actions">
                  <StartFreeCtaLink
                    href={cta.primaryHref}
                    section="scoring_engine_report"
                    ctaText={cta.primaryText}
                    className="v3-btn-primary ie-scoring-report-cta inline-flex min-h-12 w-full max-w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold no-underline sm:w-auto sm:px-8"
                    style={{ color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {cta.primaryText} →
                  </StartFreeCtaLink>
                  <ul className="ie-scoring-cta-trust" aria-label="Includes">
                    {cta.trustItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
