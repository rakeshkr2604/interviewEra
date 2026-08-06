'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Check,
  GitBranch,
  Scale,
  Shield,
  Users,
} from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { HiringTeamsProductShot } from '@/components/landing/AudienceProductShots';
import { LandingFaqCategorized } from '@/components/landing/faq/LandingFaqCategorized';
import {
  HIRING_FAQ_CATEGORIES,
  HIRING_FEATURES,
  HIRING_HERO_BULLETS,
  HIRING_HOW_IT_WORKS,
  HIRING_PAIN_POINTS,
  HIRING_PIPELINE_STAGES,
} from '@/lib/landing/hiring-content';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';
import '@/components/landing/faq/LandingFaq.css';

const FEATURE_ICONS = [Scale, GitBranch, Users] as const;

function AmbientOrbs() {
  const reduce = useReducedMotion();
  const animate = reduce ? undefined : { opacity: [0.06, 0.1, 0.06] };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -left-[20%] top-[-18%] h-[min(20rem,70vw)] w-[min(20rem,70vw)] rounded-full blur-[100px] sm:left-0"
        style={{ background: 'color-mix(in srgb, var(--accent-primary) 28%, transparent)' }}
        animate={animate}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute inset-0 opacity-[0.22] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,black,transparent)]"
        style={{
          backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--text-secondary) 6%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--text-secondary) 6%, transparent) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HiringTeamsLandingClient() {
  return (
    <div className="relative overflow-hidden">
      <AmbientOrbs />

      <section className={cn(LANDING_PAGE_CONTAINER, 'relative px-4 pb-16 pt-10 sm:px-5 sm:pb-20 sm:pt-14')}>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center xl:max-w-7xl">
          <Reveal>
            <p
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--accent-primary)' }}
            >
              <Building2 className="size-3.5" aria-hidden />
              Hiring Teams
            </p>
            <h1
              className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
              style={{ color: 'var(--text-primary)' }}
            >
              Score every candidate the same way
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Structured AI interviews and a shared hiring pipeline — from Applied to Offer — so recruiting
              teams compare signal without interviewer bias.
            </p>

            <ul className="mt-6 space-y-2.5" role="list">
              {HIRING_HERO_BULLETS.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5 text-sm sm:text-[15px]" style={{ color: 'var(--text-primary)' }}>
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)' }}
                    aria-hidden
                  >
                    <Check className="size-3" style={{ color: 'var(--accent-primary)' }} />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <TrackedCtaLink
                href="/signup?intent=business"
                ctaKey={CTA_KEYS.AUDIENCE_HIRING_TEAMS}
                ctaText="Create hiring workspace"
                section="hiring_hero"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent-primary)' }}
              >
                Create hiring workspace
                <ArrowRight className="size-4" aria-hidden />
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/login?next=%2Fhiring%2Fdashboard"
                ctaKey={CTA_KEYS.AUDIENCE_HIRING_TEAMS}
                ctaText="Sign in to HR dashboard"
                section="hiring_hero_signin"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors"
                style={{
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-primary)',
                  background: 'var(--card-bg)',
                }}
              >
                Sign in to HR dashboard
              </TrackedCtaLink>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="mx-auto w-full max-w-md lg:max-w-none">
            <HiringTeamsProductShot />
          </Reveal>
        </div>
      </section>

      <section
        className="border-y px-4 py-14 sm:px-5 sm:py-16"
        style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--bg-secondary) 70%, transparent)' }}
        aria-labelledby="hiring-pipeline-heading"
      >
        <div className={cn(LANDING_PAGE_CONTAINER, 'mx-auto max-w-6xl xl:max-w-7xl')}>
          <Reveal>
            <h2
              id="hiring-pipeline-heading"
              className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Hiring pipeline
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              One flow for every candidate — advance, shortlist, interview, offer, or reject with a clear stage history.
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <ol className="mx-auto mt-10 flex max-w-5xl flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-2 sm:gap-y-3">
              {HIRING_PIPELINE_STAGES.map((stage, i) => {
                const isLast = i === HIRING_PIPELINE_STAGES.length - 1;
                return (
                  <li key={stage} className="flex flex-col items-center gap-2 sm:flex-row sm:gap-2">
                    <span
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border px-3.5 py-2 text-center text-sm font-semibold"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
                        background: 'var(--card-bg)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {stage}
                    </span>
                    {!isLast ? (
                      <>
                        <ArrowDown
                          className="size-4 shrink-0 sm:hidden"
                          style={{ color: 'var(--text-muted)' }}
                          aria-hidden
                        />
                        <ArrowRight
                          className="hidden size-4 shrink-0 sm:block"
                          style={{ color: 'var(--text-muted)' }}
                          aria-hidden
                        />
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className={cn(LANDING_PAGE_CONTAINER, 'px-4 py-14 sm:px-5 sm:py-16')} aria-labelledby="hiring-pain-heading">
        <Reveal>
          <h2 id="hiring-pain-heading" className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            Why hiring loops lose signal
          </h2>
        </Reveal>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3" role="list">
          {HIRING_PAIN_POINTS.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.05}>
              <li
                className="h-full rounded-2xl border p-5"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              >
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      <section
        className="border-y px-4 py-14 sm:px-5 sm:py-16"
        style={{ borderColor: 'var(--card-border)' }}
        aria-labelledby="hiring-features-heading"
      >
        <div className={cn(LANDING_PAGE_CONTAINER, 'mx-auto max-w-6xl xl:max-w-7xl')}>
          <Reveal>
            <h2 id="hiring-features-heading" className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
              Built for recruiting teams
            </h2>
          </Reveal>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3" role="list">
            {HIRING_FEATURES.map((feature, i) => {
              const Icon = FEATURE_ICONS[i] ?? Shield;
              return (
                <Reveal key={feature.title} delay={i * 0.05}>
                  <li
                    className="h-full rounded-2xl border p-5"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  >
                    <span
                      className="mb-4 flex size-10 items-center justify-center rounded-xl"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                      aria-hidden
                    >
                      <Icon className="size-5" />
                    </span>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {feature.description}
                    </p>
                  </li>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </section>

      <section className={cn(LANDING_PAGE_CONTAINER, 'px-4 py-14 sm:px-5 sm:py-16')} aria-labelledby="hiring-how-heading">
        <Reveal>
          <h2 id="hiring-how-heading" className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            How it works
          </h2>
        </Reveal>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {HIRING_HOW_IT_WORKS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.05}>
              <li
                className="rounded-2xl border p-5"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
              >
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                  Step {step.step}
                </span>
                <h3 className="mt-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {step.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section
        className="ie-lh-section-faq border-t px-4 py-14 sm:px-5 sm:py-16"
        style={{ borderColor: 'var(--card-border)' }}
        aria-labelledby="hiring-faq-heading"
      >
        <div className={cn(LANDING_PAGE_CONTAINER, 'mx-auto max-w-6xl')}>
          <LandingFaqCategorized
            categories={HIRING_FAQ_CATEGORIES}
            heading={
              <>
                <h2
                  id="hiring-faq-heading"
                  className="landing-faq-title font-[family-name:var(--font-bricolage)] text-[var(--text-primary)]"
                >
                  <span className="landing-faq-title__line">Frequently Asked</span>
                  <span className="landing-faq-title__line">Questions</span>
                </h2>
              </>
            }
          />
        </div>
      </section>

      <section className={cn(LANDING_PAGE_CONTAINER, 'px-4 pb-20 pt-4 sm:px-5 sm:pb-24')}>
        <Reveal>
          <div
            className="mx-auto max-w-3xl rounded-2xl border px-6 py-10 text-center sm:px-10"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
              background:
                'linear-gradient(165deg, color-mix(in srgb, var(--card-bg) 92%, var(--accent-primary)) 0%, var(--card-bg) 55%)',
            }}
          >
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
              Ready to run structured hiring loops?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Create your hiring workspace, verify your work email, and open the HR dashboard.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <TrackedCtaLink
                href="/signup?intent=business"
                ctaKey={CTA_KEYS.AUDIENCE_HIRING_TEAMS}
                ctaText="Get started"
                section="hiring_final_cta"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white sm:w-auto"
                style={{ background: 'var(--accent-primary)' }}
              >
                Get started
                <ArrowRight className="size-4" aria-hidden />
              </TrackedCtaLink>
              <Link
                href="/campus"
                className="text-sm font-semibold underline-offset-4 hover:underline"
                style={{ color: 'var(--text-secondary)' }}
              >
                Looking for campus placements instead?
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
