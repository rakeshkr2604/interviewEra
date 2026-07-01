'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  FileText,
  Layers,
  LineChart,
  Lock,
  Mail,
  MessageSquare,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  BEFORE_AFTER,
  FAQ_ITEMS,
  FEATURES_PRIMARY,
  FEATURES_SECONDARY,
  FEATURES_SECTION,
  FINAL_CTA,
  HERO_BULLETS,
  HERO_PRICE_LINE,
  HOW_IT_WORKS_STEPS,
  PAIN_POINTS,
  PLACEMENT_PREP_COMPARISON,
  PRICING_CONTEXT,
  PRICING_FEATURES,
  SOLUTION_PILLARS,
} from '@/lib/landing/campus-content';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

const PRIMARY_FEATURE_ICONS = [Layers, Users, LineChart] as const;
const SECONDARY_FEATURE_ICONS = [MessageSquare, BarChart3, FileText] as const;

function AmbientOrbs() {
  const reduce = useReducedMotion();
  const animate = reduce
    ? undefined
    : {
        opacity: [0.06, 0.1, 0.06],
      };

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

/** Question + STAR + evaluation friction (incomplete = locked / flagged — feels strict, not decorative). */
function InterviewMechanismMockup() {
  const starBlocks = [
    { label: 'Situation' as const, sample: 'Team split on DB vs cache for peak load…' },
    { label: 'Task' as const, sample: 'I owned backend perf for the release.' },
    { label: 'Action' as const, sample: 'Benchmarked both paths, presented data to the group.' },
    { label: 'Result' as const, sample: null },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 shadow-xl sm:p-6"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 15%, var(--card-border))',
        background:
          'linear-gradient(165deg, color-mix(in srgb, var(--card-bg) 98%, var(--accent-primary)) 0%, var(--card-bg) 45%)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-50"
        style={{ background: 'color-mix(in srgb, var(--accent-primary) 22%, transparent)' }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'color-mix(in srgb, var(--accent-primary) 18%, transparent)' }}
              >
                <MessageSquare className="size-5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  Mock interview
                </p>
                <p className="mt-0.5 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  Software Engineer intern · campus batch
                </p>
              </div>
            </div>
            <span
              className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
              style={{ borderColor: 'var(--card-border)', color: 'var(--accent-primary)' }}
            >
              STAR capture
            </span>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--bg-secondary) 92%, transparent)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Question
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              Describe a time you disagreed with a teammate on an approach. What was at stake, what did you do, and what
              changed afterward?
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Answer — structured fields
            </p>
            <ul className="mt-3 space-y-2">
              {starBlocks.map((block) => {
                const missing = block.sample == null;
                return (
                  <li
                    key={block.label}
                    className="rounded-lg border px-3 py-2.5"
                    style={{
                      borderColor: missing
                        ? 'color-mix(in srgb, var(--accent-warning) 45%, var(--card-border))'
                        : 'color-mix(in srgb, var(--card-border) 90%, transparent)',
                      borderStyle: missing ? 'solid' : 'dashed',
                      background: missing ? 'color-mix(in srgb, var(--accent-warning) 8%, transparent)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                        {block.label}
                      </p>
                      {missing && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--accent-warning)' }}>
                          <AlertTriangle className="size-3 shrink-0" aria-hidden />
                          Required
                        </span>
                      )}
                    </div>
                    {missing ? (
                      <p className="mt-1 text-xs font-medium leading-relaxed" style={{ color: 'var(--accent-warning)' }}>
                        Result missing — evaluation incomplete
                      </p>
                    ) : (
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {block.sample}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div
          className="flex flex-col justify-between rounded-xl border p-4 lg:max-w-[min(100%,20rem)] lg:shrink-0"
          style={{ borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, var(--card-border))', background: 'var(--bg-secondary)' }}
        >
          <div
            className="mb-3 flex items-start gap-2 rounded-lg border px-2.5 py-2"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-warning) 35%, var(--card-border))',
              background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
            }}
          >
            <Lock className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--accent-warning)' }} aria-hidden />
            <p className="text-[11px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
              Score locked until all sections are filled
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-primary)' }}>
              Evaluation preview
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Five dimensions: communication, technical depth, structure, confidence, relevance — same bar for every student.
            </p>
            <ul className="mt-4 space-y-3">
              <li
                className="rounded-lg border px-2.5 py-2 text-sm"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
                }}
              >
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--accent-danger)' }}>
                  <AlertTriangle className="size-3.5" aria-hidden />
                  Weak answer
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Lacks measurable outcome — tie Result to a metric, deadline, or stakeholder change.
                </p>
              </li>
              <li className="text-sm">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Relevance
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Conflict-resolution intent matched — pending full STAR for score release.
                </p>
              </li>
              <li className="text-sm">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Communication
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Action sequence is clear; trim hedging once Result is added.
                </p>
              </li>
            </ul>
          </div>
          <p className="mt-4 border-t pt-3 text-[11px] leading-snug" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
            Cohort rollups use the same rubric — weak dimensions surface before drives.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CampusLandingClient({ calendlyUrl }: { calendlyUrl: string }) {
  const reduce = useReducedMotion();
  const embedSrc = `${calendlyUrl}?embed_type=Inline&hide_gdpr_banner=1`;

  return (
    <main className="relative" style={{ color: 'var(--text-primary)' }}>
      {/* Hero — two columns on lg+: copy left, mechanism mockup right */}
      <section
        className="relative overflow-hidden border-b px-4 py-16 sm:px-5 sm:py-20"
        style={{
          borderColor: 'var(--card-border)',
          background: 'var(--page-gradient)',
        }}
      >
        <AmbientOrbs />
        <div className={cn('relative', LANDING_PAGE_CONTAINER)}>
          <div className="grid items-start gap-10 text-center lg:grid-cols-12 lg:gap-10 lg:text-left xl:gap-12 2xl:gap-14">
            <div className="mx-auto flex w-full max-w-xl flex-col items-center space-y-7 lg:col-span-5 lg:mx-0 lg:max-w-none lg:items-start lg:pt-1">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <Badge
                  variant="secondary"
                  className="border px-3 py-1 text-xs font-medium tracking-wide"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Building2 className="mr-1.5 inline size-3.5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                  For T&amp;P and campus leadership
                </Badge>
              </motion.div>

              <motion.h1
                className="text-[2.25rem] font-extrabold leading-[1.08] tracking-tight text-balance sm:text-5xl md:text-6xl md:leading-[1.05]"
                style={{ color: 'var(--text-primary)' }}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.04 }}
              >
                Improve placement outcomes with structured mock interviews at scale
              </motion.h1>

              <motion.div
                className="w-full max-w-[600px] space-y-1.5 lg:max-w-none"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08 }}
              >
                <p className="text-base font-medium leading-relaxed sm:text-xl" style={{ color: 'var(--text-secondary)' }}>
                  Run structured mock interviews for entire batches and track performance before Day 1
                </p>
                <p className="text-base leading-relaxed sm:text-xl" style={{ color: 'var(--text-muted)' }}>
                  Without increasing placement team workload
                </p>
              </motion.div>

              <div className="flex w-full flex-col items-center space-y-4 lg:items-stretch">
                <motion.div
                  className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.12 }}
                >
                  <a
                    href={calendlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'inline-flex h-12 rounded-xl px-6 text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5'
                    )}
                    style={{ background: 'var(--accent-primary)', color: '#fff' }}
                  >
                    Book a 20-min demo
                    <ArrowRight className="ml-2 size-4" aria-hidden />
                  </a>
                  <a
                    href="mailto:campus@interviewera.com"
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'lg' }),
                      'inline-flex h-12 rounded-xl px-4 text-base font-semibold hover:bg-transparent'
                    )}
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <Mail className="mr-2 size-4 opacity-90" aria-hidden />
                    Email campus team
                  </a>
                </motion.div>

                <motion.ul
                  className="flex w-full max-w-md flex-col items-center space-y-2 lg:max-w-none lg:items-start"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.14 }}
                >
                  {HERO_BULLETS.map((line) => (
                    <li
                      key={line}
                      className="flex items-start justify-center gap-2 text-sm leading-snug sm:text-base lg:justify-start"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Check className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden />
                      <span className="max-w-[min(100%,22rem)] text-left sm:max-w-none">{line}</span>
                    </li>
                  ))}
                </motion.ul>
              </div>

              <motion.div
                className="space-y-1.5 text-sm sm:text-base"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.16 }}
              >
                <p style={{ color: 'var(--text-muted)' }}>
                  Free 30-day pilot · up to 20 students · no purchase order required to evaluate
                </p>
                <p className="font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {HERO_PRICE_LINE}
                </p>
              </motion.div>
            </div>

            <motion.div
              className="mx-auto w-full max-w-lg lg:col-span-7 lg:mx-0 lg:max-w-none lg:min-w-0"
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <InterviewMechanismMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Before / after — no fake logos or testimonials */}
      <section
        className="border-y px-4 py-16 sm:px-6 md:py-24"
        style={{
          borderColor: 'var(--card-border)',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 96%, var(--accent-primary)) 0%, var(--bg-secondary) 40%, var(--bg-secondary) 100%)',
        }}
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-12 text-center md:mb-14">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
                Outcomes
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl" style={{ color: 'var(--text-primary)' }}>
                {BEFORE_AFTER.title}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                {BEFORE_AFTER.subtitle}
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
            <Reveal>
              <div
                className="h-full rounded-2xl border p-6 md:p-8"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
                  Before
                </p>
                <ul className="mt-5 space-y-4">
                  {BEFORE_AFTER.before.map((line) => (
                    <li key={line} className="flex gap-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--text-muted)' }} aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div
                className="h-full rounded-2xl border p-6 md:p-8"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-primary) 5%, var(--card-bg))',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--accent-primary)' }}>
                  After
                </p>
                <ul className="mt-5 space-y-4">
                  {BEFORE_AFTER.after.map((line) => (
                    <li key={line} className="flex gap-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      <Check className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center md:mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
              Problem → solution
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Placement prep breaks at structure, scale, and measurement
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              InterviewEra is the operational layer: same interview bar for every student, unlimited reps, cohort signal for
              the office.
            </p>
          </Reveal>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <div
                className="h-full rounded-2xl border p-6 md:p-8"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
                }}
              >
                <div
                  className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
                >
                  <Target className="size-3.5" aria-hidden />
                  Problems
                </div>
                <ul className="space-y-6">
                  {PAIN_POINTS.map((p) => (
                    <li key={p.title}>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {p.title}
                      </p>
                      <p className="mt-1.5 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {p.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div
                className="h-full rounded-2xl border p-6 md:p-8"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-primary) 32%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-primary) 5%, var(--card-bg))',
                }}
              >
                <div
                  className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--accent-primary)' }}
                >
                  <Zap className="size-3.5" aria-hidden />
                  What InterviewEra does
                </div>
                <ul className="space-y-6">
                  {SOLUTION_PILLARS.map((p) => (
                    <li key={p.title} className="flex gap-3">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ background: 'var(--accent-primary)' }}
                      >
                        <Check className="size-3.5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {p.title}
                        </p>
                        <p className="mt-1.5 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {p.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Features — primary + secondary hierarchy */}
      <section
        className="border-t px-4 py-16 sm:px-6 md:py-28"
        style={{
          borderColor: 'var(--card-border)',
          background:
            'linear-gradient(180deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--bg-secondary) 92%, var(--accent-primary)) 100%)',
        }}
      >
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-14 text-center md:mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
              {FEATURES_SECTION.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl" style={{ color: 'var(--text-primary)' }}>
              {FEATURES_SECTION.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              {FEATURES_SECTION.subtitle}
            </p>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES_PRIMARY.map((item, i) => {
              const Icon = PRIMARY_FEATURE_ICONS[i];
              return (
                <Reveal key={item.title} delay={i * 0.06}>
                  <div
                    className="flex h-full flex-col rounded-2xl border p-6 shadow-lg transition-shadow duration-200 hover:shadow-xl md:p-7"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, var(--card-border))',
                      background:
                        'linear-gradient(160deg, color-mix(in srgb, var(--card-bg) 95%, var(--accent-primary)) 0%, var(--card-bg) 55%)',
                      boxShadow: 'var(--card-shadow)',
                    }}
                  >
                    <div
                      className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: 'color-mix(in srgb, var(--accent-primary) 18%, transparent)' }}
                    >
                      <Icon className="size-6" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                    </div>
                    <p className="text-lg font-bold leading-snug md:text-xl" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <dl className="mt-5 flex flex-1 flex-col gap-4 text-base leading-relaxed">
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          What it does
                        </dt>
                        <dd className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {item.does}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          How it works
                        </dt>
                        <dd className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {item.works}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Why outcomes improve
                        </dt>
                        <dd className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {item.outcome}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.12}>
            <p className="mb-5 mt-14 text-center text-xs font-semibold uppercase tracking-[0.2em] md:mt-16" style={{ color: 'var(--text-muted)' }}>
              Also included
            </p>
            <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
              {FEATURES_SECONDARY.map((item, i) => {
                const Icon = SECONDARY_FEATURE_ICONS[i];
                return (
                  <li
                    key={item.title}
                    className="rounded-xl border px-4 py-4"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' }}
                      >
                        <Icon className="size-4" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center md:mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
              Rollout
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl" style={{ color: 'var(--text-primary)' }}>
              How implementation runs on your campus
            </h2>
          </Reveal>

          <div className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div
              className="pointer-events-none absolute left-4 right-4 top-12 hidden h-px lg:block"
              style={{
                background: `linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-primary) 35%, transparent), transparent)`,
              }}
              aria-hidden
            />
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <Reveal key={step.step} delay={i * 0.06}>
                <div
                  className="relative flex h-full flex-col rounded-2xl border p-6 text-center md:text-left"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                  }}
                >
                  <div
                    className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white md:mx-0"
                    style={{
                      background: 'var(--accent-primary)',
                      boxShadow: '0 6px 20px color-mix(in srgb, var(--accent-primary) 28%, transparent)',
                    }}
                  >
                    {step.step}
                  </div>
                  <h3 className="text-base font-semibold md:text-lg" style={{ color: 'var(--text-primary)' }}>
                    {step.title}
                  </h3>
                  <p className="mt-3 flex-1 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* InterviewEra vs alternatives */}
      <section
        className="border-t px-4 py-16 sm:px-6 md:py-24"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-10 text-center md:mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
              Differentiation
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl" style={{ color: 'var(--text-primary)' }}>
              InterviewEra vs current placement prep
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Manual mocks, unstructured practice, and ad hoc ChatGPT sessions do not give committees one measurable system.
              Here is how this stack compares.
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--card-border)' }}>
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <caption className="sr-only">Comparison of placement prep approaches</caption>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th scope="col" className="border-b px-4 py-3.5 font-semibold md:px-5" style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>
                      Capability
                    </th>
                    <th scope="col" className="border-b px-3 py-3.5 font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                      Manual mocks
                    </th>
                    <th scope="col" className="border-b px-3 py-3.5 font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                      Random practice
                    </th>
                    <th scope="col" className="border-b px-3 py-3.5 font-semibold" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                      ChatGPT-style use
                    </th>
                    <th
                      scope="col"
                      className="border-b px-3 py-3.5 font-semibold"
                      style={{
                        borderColor: 'var(--card-border)',
                        color: 'var(--accent-primary)',
                        background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                      }}
                    >
                      InterviewEra
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PLACEMENT_PREP_COMPARISON.map((row) => (
                    <tr
                      key={row.criterion}
                      style={{
                        background:
                          row.criterion === 'Placement readiness'
                            ? 'color-mix(in srgb, var(--accent-primary) 7%, var(--card-bg))'
                            : 'var(--card-bg)',
                      }}
                    >
                      <th
                        scope="row"
                        className="border-b px-4 py-3.5 font-medium md:px-5"
                        style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                      >
                        {row.criterion}
                      </th>
                      <td className="border-b px-3 py-3.5" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                        {row.manual}
                      </td>
                      <td className="border-b px-3 py-3.5" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                        {row.randomPractice}
                      </td>
                      <td className="border-b px-3 py-3.5" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                        {row.chatgpt}
                      </td>
                      <td
                        className="border-b px-3 py-3.5 font-medium"
                        style={{
                          borderColor: 'var(--card-border)',
                          color: 'var(--text-primary)',
                          background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
                        }}
                      >
                        {row.interviewEra}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t px-4 py-16 sm:px-6 md:py-24" style={{ borderColor: 'var(--card-border)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Seat economics with context leadership expects
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Annual campus contract · minimum batch size · volume relief at 200+ seats.
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <div
              className="mx-auto mt-10 max-w-lg rounded-2xl border p-8 text-left shadow-xl"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
                background: 'var(--card-bg)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <p className="text-5xl font-bold tabular-nums md:text-6xl" style={{ color: 'var(--text-primary)' }}>
                ₹799
                <span className="text-xl font-medium md:text-2xl" style={{ color: 'var(--text-secondary)' }}>
                  {' '}
                  / student / year
                </span>
              </p>
              <p className="mt-3 space-y-0.5 text-base font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span className="block">{PRICING_CONTEXT.perStudentPerDay}</span>
                <span className="block" style={{ color: 'var(--text-primary)' }}>
                  {PRICING_CONTEXT.missedOpportunity}
                </span>
              </p>
              <p className="mt-3 text-base" style={{ color: 'var(--text-muted)' }}>
                Minimum 50 seats · ₹39,950 minimum annual contract · discounts at 200+ seats
              </p>

              <ul className="mt-6 space-y-3 rounded-xl border p-4 text-base leading-relaxed" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                <li>{PRICING_CONTEXT.agencyComparison}</li>
                <li>{PRICING_CONTEXT.roi}</li>
              </ul>

              <ul className="mt-6 space-y-2.5 text-base" style={{ color: 'var(--text-secondary)' }}>
                {PRICING_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: 'lg' }), 'h-11 flex-1 rounded-xl font-semibold')}
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  <Calendar className="mr-2 size-4" aria-hidden />
                  Start pilot
                </a>
                <Link
                  href="/join"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'h-11 flex-1 rounded-xl font-semibold'
                  )}
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  See individual plans
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="border-t px-4 py-16 sm:px-6 md:py-24"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Placement officer FAQs
            </h2>
            <p className="mt-3 text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Straight answers for committees evaluating vendors this season.
            </p>
          </Reveal>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <Reveal key={item.q} delay={i * 0.04}>
                <details
                  className="group rounded-2xl border transition-colors open:shadow-md"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                >
                  <summary
                    className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-left text-base font-semibold md:text-lg [&::-webkit-details-marker]:hidden"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.q}
                    <ChevronDown
                      className="size-5 shrink-0 transition-transform group-open:rotate-180 md:size-6"
                      style={{ color: 'var(--text-muted)' }}
                      aria-hidden
                    />
                  </summary>
                  <p
                    className="border-t px-5 pb-4 pt-3 text-base leading-relaxed md:text-[17px]"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                  >
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Campus workspace bridge — qualified visitors toward activation */}
      <section
        className="border-t px-4 py-16 sm:px-6 md:py-20"
        style={{ borderColor: 'var(--card-border)' }}
        aria-labelledby="campus-workspace-bridge-heading"
      >
        <div className={cn('mx-auto max-w-3xl text-center', LANDING_PAGE_CONTAINER)}>
          <Reveal>
            <h2
              id="campus-workspace-bridge-heading"
              className="text-2xl font-bold tracking-tight text-balance sm:text-3xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Ready to set up your campus workspace?
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink
                href="/signup?intent=college"
                ctaKey={CTA_KEYS.CAMPUS_WORKSPACE}
                ctaText="Set up Campus Workspace"
                section="campus_bridge"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'inline-flex h-12 min-h-[44px] rounded-xl px-8 text-base font-semibold shadow-lg sm:h-[3.25rem] sm:text-lg',
                )}
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
              >
                Set up Campus Workspace
                <ArrowRight className="ml-2 size-4" aria-hidden />
              </TrackedCtaLink>
              <TrackedCtaLink
                href="/college"
                ctaKey={CTA_KEYS.FOR_COLLEGES}
                ctaText="Learn about the campus platform"
                section="campus_bridge"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'inline-flex h-12 min-h-[44px] rounded-xl px-8 text-base font-semibold sm:h-[3.25rem] sm:text-lg',
                )}
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              >
                Learn about the campus platform
              </TrackedCtaLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final CTA — two columns on lg: copy + CTAs left, timeline right; Calendly full width below */}
      <section
        className="border-t px-4 py-20 sm:px-5 md:py-28"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className={cn('relative', LANDING_PAGE_CONTAINER)}>
          <div className="flex flex-col gap-10 text-center lg:grid lg:grid-cols-12 lg:items-start lg:gap-12 lg:text-left xl:gap-14">
            <Reveal className="order-1 mx-auto w-full max-w-xl lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:mx-0 lg:max-w-none lg:self-start">
              <h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl" style={{ color: 'var(--text-primary)' }}>
                {FINAL_CTA.headline}
              </h2>
              <p className="mt-4 text-base font-medium leading-relaxed md:text-lg" style={{ color: 'var(--text-primary)' }}>
                {FINAL_CTA.urgencyLine}
              </p>
              <p className="mt-4 text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                {FINAL_CTA.body}
              </p>
              <p className="mt-3 text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-muted)' }}>
                {FINAL_CTA.closingLine}
              </p>
            </Reveal>

            <Reveal
              className="order-2 mx-auto w-full max-w-xl lg:col-span-8 lg:col-start-5 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:max-w-none lg:min-w-0"
              delay={0.04}
            >
              <div
                className="rounded-3xl border-2 p-7 text-left shadow-xl sm:p-8 md:p-9 lg:sticky lg:top-24"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)' }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.15em] sm:text-[13px]" style={{ color: 'var(--accent-primary)' }}>
                  {FINAL_CTA.timelineTitle}
                </p>
                <ul className="mt-5 space-y-5 md:mt-6 md:space-y-6">
                  {FINAL_CTA.timeline.map((row) => (
                    <li key={row.phase} className="flex gap-5 text-[17px] md:text-lg md:gap-6">
                      <span className="w-[4.5rem] shrink-0 font-semibold tabular-nums sm:w-28" style={{ color: 'var(--text-primary)' }}>
                        {row.phase}
                      </span>
                      <span className="min-w-0 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {row.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal
              className="order-3 flex w-full flex-col items-center space-y-6 text-center lg:col-span-12 lg:col-start-1 lg:row-start-3 lg:max-w-none lg:pt-2"
              delay={0.06}
            >
              <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'inline-flex h-12 rounded-xl px-8 text-base font-semibold shadow-lg sm:h-[3.25rem] sm:text-lg'
                  )}
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  Book a 20-min demo
                  <ArrowRight className="ml-2 size-4 sm:size-[1.125rem]" aria-hidden />
                </a>
                <a
                  href="mailto:campus@interviewera.com"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'lg' }),
                    'inline-flex h-12 rounded-xl px-6 text-base font-semibold hover:bg-transparent sm:h-[3.25rem] sm:text-lg'
                  )}
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <Mail className="mr-2 size-4" aria-hidden />
                  Email campus team
                </a>
              </div>
              <p className="w-full max-w-2xl text-center text-balance text-base md:text-lg" style={{ color: 'var(--text-muted)' }}>
                Questions before booking?{' '}
                <a
                  href="mailto:campus@interviewera.com"
                  className="font-medium underline-offset-4 hover:underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  campus@interviewera.com
                </a>
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div
              className="mx-auto mt-12 h-[min(680px,85vh)] w-full max-w-[720px] overflow-hidden rounded-2xl border shadow-xl lg:mt-14 lg:max-w-none"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <iframe
                src={embedSrc}
                width="100%"
                height="100%"
                className="h-full min-h-[560px] w-full border-0 sm:min-h-[640px]"
                title="Book a 20-minute campus demo"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
