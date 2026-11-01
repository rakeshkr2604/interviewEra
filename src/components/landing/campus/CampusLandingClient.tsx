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
  ClipboardCheck,
  FileSearch,
  Layers,
  LifeBuoy,
  LineChart,
  Mail,
  MessageSquare,
  Users,
} from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  ABOUT_FOR_COLLEGES,
  BEFORE_AFTER,
  CAPABILITIES,
  CAPABILITIES_SECTION,
  DEMO_SECTION,
  DESIGNED_FOR,
  FAQ_ITEMS,
  FINAL_CTA,
  FOUNDER_SECTION,
  HERO,
  HERO_BULLETS,
  HERO_PRICE_LINE,
  HOW_IT_WORKS_STEPS,
  PILOT_CRITERIA,
  PLACEMENT_PREP_COMPARISON,
  PLATFORM_FACTS,
  PRICING_CONTEXT,
  PRICING_FEATURES,
  WHY_POINTS,
} from '@/lib/landing/campus-content';
import { CampusHeroHeadline } from '@/components/landing/campus/CampusHeroHeadline';
import { siteOrganizationStructured } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

const CAPABILITY_ICONS = {
  batch: Users,
  evaluation: Layers,
  resume: FileSearch,
  tracking: LineChart,
  reports: BarChart3,
  onboarding: LifeBuoy,
} as const satisfies Record<(typeof CAPABILITIES)[number]['id'], unknown>;

const FOUNDER = siteOrganizationStructured.founder;

const SECTION_EYEBROW = 'text-xs font-semibold uppercase tracking-[0.2em]';
const SECTION_TITLE = 'mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl';
const SECTION_PAD = 'px-5 py-10 sm:px-6 sm:py-16 md:py-24 lg:px-8 xl:px-10';

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

/** Illustrative question + STAR answer + feedback. A missing part is flagged in feedback; scores are never withheld. */
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
              Illustrative
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
                          Missing
                        </span>
                      )}
                    </div>
                    {missing ? (
                      <p className="mt-1 text-xs font-medium leading-relaxed" style={{ color: 'var(--accent-warning)' }}>
                        Result missing — flagged in feedback
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
          className="hidden flex-col justify-between rounded-xl border p-4 sm:flex lg:max-w-[min(100%,20rem)] lg:shrink-0"
          style={{ borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, var(--card-border))', background: 'var(--bg-secondary)' }}
        >
          <div
            className="mb-3 flex items-start gap-2 rounded-lg border px-2.5 py-2"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-warning) 35%, var(--card-border))',
              background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
            }}
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--accent-warning)' }} aria-hidden />
            <p className="text-[11px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
              Answer Structure: Result is missing
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-primary)' }}>
              Evaluation preview
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Five dimensions: Communication Clarity, Content Accuracy, Answer Structure, Specificity, Relevance — same bar for every student.
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
                  Conflict-resolution intent matched the question.
                </p>
              </li>
              <li className="text-sm">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Communication Clarity
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Action sequence is clear; trim hedging once Result is added.
                </p>
              </li>
            </ul>
          </div>
          <p className="mt-4 border-t pt-3 text-[11px] leading-snug" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
            Illustrative sample. Cohort analytics use the same rubric, so weak dimensions surface before drives.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CampusLandingClient({ calendlyUrl }: { calendlyUrl: string }) {
  const reduce = useReducedMotion();

  return (
    <main id="main-content" className="relative" style={{ color: 'var(--text-primary)' }}>
      {/* Hero — two columns on lg+: copy left, mechanism mockup right */}
      <section
        className="relative overflow-hidden border-b px-5 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:px-8 lg:pb-24 lg:pt-14 xl:px-10"
        style={{
          borderColor: 'var(--card-border)',
          background: 'var(--page-gradient)',
        }}
      >
        <AmbientOrbs />
        <div className="relative mx-auto w-full max-w-6xl xl:max-w-7xl">
          <div className="grid items-start gap-12 text-center lg:grid-cols-12 lg:items-center lg:gap-14 lg:text-left xl:gap-16">
            <div className="mx-auto flex w-full max-w-xl flex-col items-center space-y-6 text-left sm:space-y-7 lg:col-span-5 lg:mx-0 lg:max-w-none lg:items-start lg:pr-2 xl:pr-4">
              <motion.div
                className="w-full"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <Badge
                  variant="secondary"
                  className="h-auto max-w-full whitespace-normal border px-3 py-1 text-left text-xs font-medium leading-snug tracking-wide"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Building2 className="mr-1.5 inline size-3.5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                  {HERO.badge}
                </Badge>
              </motion.div>

              {/* No entrance animation: the H1 is the LCP element and must paint immediately. */}
              <CampusHeroHeadline className="mx-auto lg:mx-0" />

              <motion.div
                className="w-full max-w-[36rem] space-y-1.5 lg:max-w-none"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08 }}
              >
                <p className="text-[15px] font-medium leading-snug sm:text-lg lg:text-xl lg:leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {HERO.body}
                </p>
              </motion.div>

              <motion.div
                className="flex w-full max-w-md flex-col gap-6 lg:max-w-none"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 }}
              >
                {/* Primary actions */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                    <TrackedCtaLink
                      href={calendlyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      prefetch={false}
                      ctaKey={CTA_KEYS.CAMPUS_DEMO}
                      ctaText="Book a Campus Demo"
                      section="campus_hero"
                      className={cn(
                        buttonVariants({ size: 'lg' }),
                        'inline-flex h-12 min-h-[44px] w-full items-center justify-center rounded-xl px-5 text-[15px] font-semibold shadow-lg transition-transform hover:-translate-y-0.5 motion-reduce:transform-none'
                      )}
                      style={{ background: 'var(--accent-primary)', color: '#fff' }}
                    >
                      Book a Campus Demo
                      <ArrowRight className="ml-2 size-4 shrink-0" aria-hidden />
                    </TrackedCtaLink>
                    <TrackedCtaLink
                      href="#campus-capabilities"
                      ctaKey={CTA_KEYS.FOR_COLLEGES}
                      ctaText="Explore Campus Solution"
                      section="campus_hero"
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'lg' }),
                        'inline-flex h-12 min-h-[44px] w-full items-center justify-center rounded-xl border-[1.5px] px-5 text-[15px] font-semibold transition-transform hover:-translate-y-0.5 motion-reduce:transform-none'
                      )}
                      style={{
                        borderColor: 'var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                      }}
                    >
                      Explore Campus Solution
                    </TrackedCtaLink>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <TrackedCtaLink
                      href="/signup?intent=college"
                      ctaKey={CTA_KEYS.CAMPUS_WORKSPACE}
                      ctaText="Set up Campus Workspace"
                      section="campus_hero"
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      Set up Campus Workspace
                      <ArrowRight className="size-3.5" aria-hidden />
                    </TrackedCtaLink>
                    <a
                      href="mailto:campus@interviewera.com"
                      className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      <Mail className="size-4 opacity-90" aria-hidden />
                      Email campus team
                    </a>
                  </div>
                </div>

                {/* Proof points */}
                <ul
                  className="space-y-2.5 rounded-2xl border px-4 py-3.5 sm:px-5 sm:py-4"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--card-border) 90%, transparent)',
                    background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                  }}
                  role="list"
                >
                  {HERO_BULLETS.map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-2.5 text-sm leading-snug sm:text-[15px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0"
                        style={{ color: 'var(--accent-success)' }}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                {/* Commercial terms */}
                <div
                  className="space-y-1 border-t pt-4 text-left text-[13px] leading-relaxed sm:text-sm"
                  style={{ borderColor: 'color-mix(in srgb, var(--card-border) 85%, transparent)' }}
                >
                  <p style={{ color: 'var(--text-muted)' }}>
                    Free 30-day pilot · up to 20 students · no purchase order required
                  </p>
                  <p className="font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {HERO_PRICE_LINE}
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.div
              className="mx-auto w-full max-w-lg lg:col-span-7 lg:mx-0 lg:max-w-none lg:min-w-0 lg:pl-2 xl:pl-4"
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <InterviewMechanismMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 03 · Institutional credibility without logos — operational problems addressed */}
      <section className="border-b px-5 py-12 sm:px-6 md:py-16 lg:px-8 xl:px-10" style={{ borderColor: 'var(--card-border)' }} aria-labelledby="campus-designed-for-heading">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-8 text-center md:mb-10">
            <p className={SECTION_EYEBROW} style={{ color: 'var(--accent-primary)' }}>
              {DESIGNED_FOR.eyebrow}
            </p>
            <h2 id="campus-designed-for-heading" className="mt-3 text-2xl font-bold tracking-tight text-balance md:text-3xl" style={{ color: 'var(--text-primary)' }}>
              {DESIGNED_FOR.title}
            </h2>
          </Reveal>
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" role="list">
            {DESIGNED_FOR.items.map((item, i) => (
              <li key={item.title} className="h-full">
                <Reveal delay={i * 0.05} className="h-full">
                  <div className="h-full rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 04 · About InterviewEra for colleges (problem → solution) */}
      <section className={SECTION_PAD} aria-labelledby="campus-about-heading">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-8 text-center md:mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
              {ABOUT_FOR_COLLEGES.eyebrow}
            </p>
            <h2 id="campus-about-heading" className={SECTION_TITLE} style={{ color: 'var(--text-primary)' }}>
              {ABOUT_FOR_COLLEGES.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              {ABOUT_FOR_COLLEGES.body}
            </p>
          </Reveal>

        </div>
      </section>

      {/* 05 · Platform capabilities — each maps to shipped functionality */}
      <section
        id="campus-capabilities"
        className={cn('scroll-mt-20 border-t', SECTION_PAD)}
        style={{
          borderColor: 'var(--card-border)',
          background:
            'linear-gradient(180deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--bg-secondary) 92%, var(--accent-primary)) 100%)',
        }}
        aria-labelledby="campus-capabilities-heading"
      >
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-8 text-center md:mb-14">
            <p className={SECTION_EYEBROW} style={{ color: 'var(--accent-primary)' }}>
              {CAPABILITIES_SECTION.eyebrow}
            </p>
            <h2 id="campus-capabilities-heading" className={SECTION_TITLE} style={{ color: 'var(--text-primary)' }}>
              {CAPABILITIES_SECTION.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              {CAPABILITIES_SECTION.subtitle}
            </p>
          </Reveal>
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3" role="list">
            {CAPABILITIES.map((item, i) => {
              const Icon = CAPABILITY_ICONS[item.id];
              return (
                <li key={item.id} className="h-full">
                  <Reveal delay={i * 0.05} className="h-full">
                    <div
                      className="grid h-full grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 rounded-2xl border p-4 transition-shadow duration-200 hover:shadow-xl sm:flex sm:flex-col sm:p-6"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
                        background: 'var(--card-bg)',
                      }}
                    >
                      <div
                        className="row-span-2 flex h-10 w-10 items-center justify-center rounded-xl sm:mb-4 sm:h-11 sm:w-11"
                        style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)' }}
                      >
                        <Icon className="size-5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                      </div>
                      <h3 className="text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed sm:mt-2 sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                        {item.body}
                      </p>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 06 · Why InterviewEra — before / after, no fake logos or testimonials */}
      <section
        aria-labelledby="campus-why-heading"
        className="border-y px-5 py-10 sm:px-6 sm:py-16 md:py-24 lg:px-8 xl:px-10"
        style={{
          borderColor: 'var(--card-border)',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 96%, var(--accent-primary)) 0%, var(--bg-secondary) 40%, var(--bg-secondary) 100%)',
        }}
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-8 text-center md:mb-14">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
                What changes
              </p>
              <h2 id="campus-why-heading" className={SECTION_TITLE} style={{ color: 'var(--text-primary)' }}>
                {BEFORE_AFTER.title}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                {BEFORE_AFTER.subtitle}
              </p>
              <ul className="mx-auto mt-6 hidden max-w-3xl flex-wrap justify-center gap-2 sm:flex" role="list">
                {WHY_POINTS.map((point) => (
                  <li
                    key={point}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                  >
                    <Check className="size-3.5" style={{ color: 'var(--accent-success)' }} aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:gap-6 lg:grid-cols-2 lg:gap-10">
            <Reveal>
              <div
                className="h-full rounded-2xl border p-4 sm:p-6 md:p-8"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>
                  Before
                </p>
                <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                  {BEFORE_AFTER.before.map((line) => (
                    <li key={line} className="flex gap-3 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--text-muted)' }} aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div
                className="h-full rounded-2xl border p-4 sm:p-6 md:p-8"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-primary) 5%, var(--card-bg))',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--accent-primary)' }}>
                  After
                </p>
                <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                  {BEFORE_AFTER.after.map((line) => (
                    <li key={line} className="flex gap-3 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
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

      {/* InterviewEra vs alternatives */}
      <section
        className="border-t px-5 py-10 sm:px-6 sm:py-16 md:py-24 lg:px-8 xl:px-10"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-8 text-center md:mb-14">
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
                          row.criterion === 'Readiness signal'
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

      {/* 07 · Platform facts — product capabilities, never adoption numbers */}
      <section className="px-5 py-12 sm:px-6 md:py-16 lg:px-8 xl:px-10" aria-labelledby="campus-facts-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="campus-facts-heading" className="sr-only">
            Platform facts
          </h2>
          <ul className="grid list-none grid-cols-2 gap-4 p-0 lg:grid-cols-4" role="list">
            {PLATFORM_FACTS.map((fact, i) => (
              <li key={fact.label} className="h-full">
                <Reveal delay={i * 0.05} className="h-full">
                  <div className="h-full rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                    <p className="text-3xl font-extrabold tabular-nums md:text-4xl" style={{ color: 'var(--accent-primary)' }}>
                      {fact.value}
                    </p>
                    <p className="mt-2 text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
                      {fact.label}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Product capabilities, not usage or placement statistics.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-10 sm:px-6 sm:py-16 md:py-24 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-8 text-center md:mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
              Campus process
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl" style={{ color: 'var(--text-primary)' }}>
              How it works on your campus
            </h2>
          </Reveal>

          <ol className="relative grid list-none gap-3 p-0 md:grid-cols-2 md:gap-6 lg:grid-cols-5" role="list">
            <div
              className="pointer-events-none absolute left-4 right-4 top-12 hidden h-px lg:block"
              style={{
                background: `linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-primary) 35%, transparent), transparent)`,
              }}
              aria-hidden
            />
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <li key={step.step} className="h-full">
                <Reveal delay={i * 0.06} className="h-full">
                  <div
                    className="relative grid h-full grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 rounded-2xl border p-4 md:flex md:flex-col md:p-6"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                    }}
                  >
                    <div
                      className="row-span-2 flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold text-white md:mb-4 md:h-12 md:w-12 md:rounded-2xl md:text-lg"
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
                    <p className="mt-1 flex-1 text-sm leading-relaxed md:mt-3 md:text-base" style={{ color: 'var(--text-secondary)' }}>
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 09 · Product walkthrough — illustrative data only */}
      <section className={cn('border-t', SECTION_PAD)} style={{ borderColor: 'var(--card-border)' }} aria-labelledby="campus-demo-heading">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-8 text-center md:mb-12">
            <p className={SECTION_EYEBROW} style={{ color: 'var(--accent-primary)' }}>
              {DEMO_SECTION.eyebrow}
            </p>
            <h2 id="campus-demo-heading" className={SECTION_TITLE} style={{ color: 'var(--text-primary)' }}>
              {DEMO_SECTION.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              {DEMO_SECTION.subtitle}
            </p>
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <figure className="m-0 h-full rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                <figcaption className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Campus dashboard · cohort view
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'color-mix(in srgb, var(--text-muted) 14%, transparent)', color: 'var(--text-muted)' }}>
                    Illustrative
                  </span>
                </figcaption>
                <div aria-hidden className="mt-5 space-y-3">
                  {[
                    ['Communication Clarity', 68],
                    ['Content Accuracy', 72],
                    ['Answer Structure', 54],
                    ['Specificity', 49],
                    ['Relevance', 77],
                  ].map(([label, value]) => (
                    <div key={label as string} className="grid grid-cols-[9.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-xs sm:text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span className="h-2 overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, var(--text-muted) 16%, transparent)' }}>
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${value}%`,
                            background: (value as number) < 55 ? 'var(--accent-warning)' : 'var(--accent-primary)',
                          }}
                        />
                      </span>
                      <span className="text-right font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {((value as number) / 10).toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 rounded-xl border px-3 py-2 text-xs leading-relaxed" style={{ borderColor: 'color-mix(in srgb, var(--accent-warning) 35%, var(--card-border))', color: 'var(--text-secondary)' }}>
                  Weakest batch dimensions: Specificity and Answer Structure — a focus for this week’s clinic.
                </p>
              </figure>
            </Reveal>
            <Reveal delay={0.06}>
              <figure className="m-0 h-full rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                <figcaption className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Students · practice deadline
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'color-mix(in srgb, var(--text-muted) 14%, transparent)', color: 'var(--text-muted)' }}>
                    Illustrative
                  </span>
                </figcaption>
                <ul aria-hidden className="mt-5 divide-y text-sm" style={{ borderColor: 'var(--card-border)' }}>
                  {[
                    ['Student A', '3 sessions', 'On track'],
                    ['Student B', '1 session', 'Needs a nudge'],
                    ['Student C', '4 sessions', 'On track'],
                    ['Student D', '0 sessions', 'Not started'],
                  ].map(([name, sessions, status]) => (
                    <li key={name} className="flex items-center justify-between gap-3 py-2.5" style={{ borderColor: 'var(--card-border)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{sessions}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          color: status === 'On track' ? 'var(--accent-success)' : 'var(--accent-warning)',
                          background: status === 'On track'
                            ? 'color-mix(in srgb, var(--accent-success) 12%, transparent)'
                            : 'color-mix(in srgb, var(--accent-warning) 12%, transparent)',
                        }}
                      >
                        {status}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Deadlines with reminders, per-student history and a CSV export are part of the campus dashboard.
                </p>
              </figure>
            </Reveal>
          </div>
          <p className="mt-5 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            {DEMO_SECTION.disclosure}
          </p>
        </div>
      </section>

      {/* 10 · Founder — real person only, no fictional team */}
      <section className={cn('border-t', SECTION_PAD)} style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }} aria-labelledby="campus-founder-heading">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-8 text-center">
            <p className={SECTION_EYEBROW} style={{ color: 'var(--accent-primary)' }}>
              {FOUNDER_SECTION.eyebrow}
            </p>
            <h2 id="campus-founder-heading" className={SECTION_TITLE} style={{ color: 'var(--text-primary)' }}>
              {FOUNDER_SECTION.title}
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="flex flex-col gap-5 rounded-2xl border p-6 sm:flex-row sm:items-start sm:p-8" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold"
                style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)' }}
                aria-hidden
              >
                RK
              </div>
              <div className="min-w-0 space-y-3">
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  {FOUNDER.name}{' '}
                  <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    · {FOUNDER.jobTitle}
                  </span>
                </p>
                {FOUNDER_SECTION.body.map((line) => (
                  <p key={line} className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {line}
                  </p>
                ))}
                <Link href="/about" className="inline-flex min-h-[44px] items-center text-sm font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  About InterviewEra
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 11 · Pilot evaluation criteria — replaces testimonials until approved ones exist */}
      <section className={SECTION_PAD} aria-labelledby="campus-pilot-heading">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-8 text-center md:mb-12">
            <p className={SECTION_EYEBROW} style={{ color: 'var(--accent-primary)' }}>
              {PILOT_CRITERIA.eyebrow}
            </p>
            <h2 id="campus-pilot-heading" className={SECTION_TITLE} style={{ color: 'var(--text-primary)' }}>
              {PILOT_CRITERIA.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              {PILOT_CRITERIA.subtitle}
            </p>
          </Reveal>
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4" role="list">
            {PILOT_CRITERIA.items.map((item, i) => (
              <li key={item.title} className="h-full">
                <Reveal delay={i * 0.05} className="h-full">
                  <div className="h-full rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}>
                    <ClipboardCheck className="size-5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                    <p className="mt-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t px-5 py-10 sm:px-6 sm:py-16 md:py-24 lg:px-8 xl:px-10" style={{ borderColor: 'var(--card-border)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-primary)' }}>
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance md:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Campus pricing
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Annual campus contract · minimum batch size · volume discounts at 200+ seats. Separate from individual Starter and Pro plans.
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
                <span className="block" style={{ color: 'var(--text-primary)' }}>
                  {PRICING_CONTEXT.missedOpportunity}
                </span>
              </p>
              <p className="mt-3 text-base" style={{ color: 'var(--text-muted)' }}>
                Minimum 50 seats · ₹39,950 minimum annual contract · discounts at 200+ seats
              </p>

              <p className="mt-6 rounded-xl border p-4 text-base leading-relaxed" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                Free 30-day pilot for up to 20 students before any contract.
              </p>

              <ul className="mt-6 space-y-2.5 text-base" style={{ color: 'var(--text-secondary)' }}>
                {PRICING_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TrackedCtaLink
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  prefetch={false}
                  ctaKey={CTA_KEYS.CAMPUS_DEMO}
                  ctaText="Start pilot"
                  section="campus_pricing"
                  className={cn(buttonVariants({ size: 'lg' }), 'h-11 min-h-11 rounded-xl font-semibold sm:flex-1')}
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  <Calendar className="mr-2 size-4" aria-hidden />
                  Start pilot
                </TrackedCtaLink>
                <Link
                  href="/pricing"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'h-11 min-h-11 rounded-xl font-semibold sm:flex-1'
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
        className="border-t px-5 py-10 sm:px-6 sm:py-16 md:py-24 lg:px-8 xl:px-10"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-3xl">
          <Reveal className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Placement officer FAQs
            </h2>
            <p className="mt-3 text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Onboarding, seats, pilots, pricing, reporting, privacy and support.
            </p>
          </Reveal>
          <div className="space-y-2 sm:space-y-3">
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

      {/* Final CTA — two columns on lg: copy + CTAs left, timeline right; Calendly full width below */}
      <section
        id="campus-final-cta"
        className="border-t px-5 py-12 sm:px-6 sm:py-20 md:py-28 lg:px-8 xl:px-10"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="relative mx-auto w-full max-w-6xl xl:max-w-7xl">
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
              {FINAL_CTA.closingLine ? (
                <p className="mt-3 text-base leading-relaxed md:text-lg" style={{ color: 'var(--text-muted)' }}>
                  {FINAL_CTA.closingLine}
                </p>
              ) : null}
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
                <TrackedCtaLink
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  prefetch={false}
                  ctaKey={CTA_KEYS.CAMPUS_DEMO}
                  ctaText="Book a Campus Demo"
                  section="campus_final_cta"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'inline-flex h-12 rounded-xl px-8 text-base font-semibold shadow-lg sm:h-[3.25rem] sm:text-lg'
                  )}
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  Book a Campus Demo
                  <ArrowRight className="ml-2 size-4 sm:size-[1.125rem]" aria-hidden />
                </TrackedCtaLink>
                <TrackedCtaLink
                  href="/signup?intent=college"
                  ctaKey={CTA_KEYS.CAMPUS_WORKSPACE}
                  ctaText="Set up Campus Workspace"
                  section="campus_final_cta"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'inline-flex h-12 min-h-[44px] rounded-xl border-[1.5px] px-6 text-base font-semibold sm:h-[3.25rem] sm:px-8 sm:text-lg'
                  )}
                  style={{
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)',
                    background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                  }}
                >
                  Set up Campus Workspace
                  <ArrowRight className="ml-2 size-4 sm:size-[1.125rem]" aria-hidden />
                </TrackedCtaLink>
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
            </Reveal>
          </div>

        </div>
      </section>
    </main>
  );
}
