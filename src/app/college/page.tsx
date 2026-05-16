import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { generateMetadata } from '@/lib/seo/metadata';
import {
  ArrowRight,
  BarChart2,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronRight,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  Star,
  TrendingUp,
  Upload,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';

export const metadata = generateMetadata({
  title: 'Campus Placement Training Platform for Colleges — InterviewEra',
  description:
    'AI mock interviews for your entire batch + T&P analytics dashboard. Book a free pilot for 50 students, 3 months, no credit card.',
  path: '/college',
});

// ─── Static data ───────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    icon: XCircle,
    stat: '₹5,000+',
    label: 'per student for traditional coaching',
    detail: "GD/PI coaching centres charge per student, per round. For a batch of 200 that's ₹10 lakh — before results.",
  },
  {
    icon: XCircle,
    stat: '60%',
    label: "students can't afford private coaching",
    detail: 'Most Tier-2 / Tier-3 students skip mock sessions entirely. They enter campus interviews underprepared.',
  },
  {
    icon: XCircle,
    stat: '0',
    label: 'real-time visibility for T&P officers',
    detail: "You hear about weak students after the company rejects them — not before. There's no early-warning system.",
  },
] as const;

const SOLUTION_PILLARS = [
  {
    icon: MessageSquare,
    title: 'Unlimited Practice',
    desc: 'Every student gets unlimited AI mock interviews — resume-aware, rubric-scored, available 24 × 7. No booking, no waiting.',
    accent: 'var(--accent-primary)',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Tracking',
    desc: "Watch every student's tier, score trend, and session count live. Flag who's at-risk before placement season peaks.",
    accent: '#8b5cf6',
  },
  {
    icon: TrendingUp,
    title: 'Data-Driven Insights',
    desc: 'Cohort heatmaps, placement-readiness percentages, and per-student drill-downs — so your outreach is targeted, not guesswork.',
    accent: '#06b6d4',
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Upload,
    title: 'Upload CSV → Send Invites',
    desc: 'Export your student roll from ERP, upload the CSV. InterviewEra sends personalised email invites automatically. Students receive a one-click join link.',
    time: '< 2 minutes for 200 students',
  },
  {
    step: '02',
    icon: MessageSquare,
    title: 'Students Practice on Their Own',
    desc: 'Each student uploads their resume, picks a role and difficulty, and starts an AI mock interview. 6 questions, rubric-scored, detailed feedback — all self-serve.',
    time: '15–25 min per session',
  },
  {
    step: '03',
    icon: BarChart2,
    title: 'Track Progress in Real Time',
    desc: 'Your T&P dashboard updates live. See tier distribution, score trends, session activity heatmaps, and a placement-readiness breakdown for your entire cohort.',
    time: 'Live — no manual reports',
  },
] as const;

const DASHBOARD_STATS = [
  { label: 'Students Enrolled', value: '148', sub: 'of 200 seats', color: 'var(--accent-primary)' },
  { label: 'Placement Ready', value: '63', sub: '42% of batch', color: 'var(--accent-success, #22c55e)' },
  { label: 'Avg. Score', value: '6.8', sub: 'out of 10', color: '#8b5cf6' },
  { label: 'Sessions This Week', value: '94', sub: '↑ 31% vs last week', color: '#06b6d4' },
] as const;

const DASHBOARD_TIER_BARS = [
  { tier: 'Tier 4 — Mock Panel', pct: 8, color: 'var(--accent-warning, #f59e0b)' },
  { tier: 'Tier 3 — Company Patterns', pct: 34, color: '#8b5cf6' },
  { tier: 'Tier 2 — Advanced', pct: 41, color: 'var(--accent-primary)' },
  { tier: 'Tier 1 — Fundamentals', pct: 17, color: 'var(--text-muted, #9ca3af)' },
] as const;

const PRICING = [
  {
    name: 'Tier-3 College',
    price: '₹49,999',
    period: '/year',
    seats: '50–100 students',
    highlight: false,
    cta: { label: 'Start Free Pilot', href: '/college/signup' },
    features: [
      'Up to 100 student seats',
      'Unlimited AI mock interviews',
      'Bulk CSV invite',
      'Basic cohort analytics',
      'Tier & score tracking',
      'Email support (48h SLA)',
    ],
  },
  {
    name: 'Tier-2 College',
    price: '₹99,999',
    period: '/year',
    seats: '100–200 students',
    highlight: true,
    badge: 'Most Popular',
    cta: { label: 'Start Free Pilot', href: '/college/signup' },
    features: [
      'Up to 200 student seats',
      'Unlimited AI mock interviews',
      'Bulk CSV invite + auto-reminders',
      'Advanced analytics & score trends',
      'Placement deadline tracking',
      'Per-student drill-down reports',
      'Priority support (12h SLA)',
    ],
  },
  {
    name: 'Premium',
    price: '₹1,99,999',
    period: '/year',
    seats: '200+ students',
    highlight: false,
    cta: { label: 'Book Demo', href: 'mailto:campus@interviewera.in' },
    features: [
      'Unlimited student seats',
      'Unlimited AI mock interviews',
      'Cohort leaderboard',
      'Custom college branding',
      'Dedicated account manager',
      'API access for ERP integration',
      'On-site training session',
    ],
  },
] as const;

const FAQS = [
  {
    q: 'How long does setup take?',
    a: 'Under 10 minutes from signup to first invite sent. You create your campus account, upload your student CSV, and InterviewEra sends personalised email invitations automatically. Most T&P officers complete setup during a single tea break.',
  },
  {
    q: 'What support does our college get?',
    a: 'All plans include email support. Tier-2 plans get priority 12-hour SLA. Premium colleges get a dedicated account manager who conducts an onboarding call, helps set deadlines, and is reachable via WhatsApp. We also provide a short video walkthrough for students.',
  },
  {
    q: 'Can we customise the platform for our college?',
    a: 'Premium plans include custom branding (logo, college name in emails). For all plans, you control which roles and difficulty levels students see, placement deadlines, and milestone targets. API access for ERP integration is available on Premium.',
  },
  {
    q: 'What happens after the 3-month free pilot ends?',
    a: "We'll send you a full cohort report 2 weeks before the pilot ends — scores, tier progression, sessions completed. If you see value, you can convert to a paid annual plan. No automatic billing. No pressure. Your student data is exportable any time.",
  },
  {
    q: 'Do students need to pay anything?',
    a: 'No. The college pays once per year. Students get completely free, unlimited access for the entire academic year. There are no in-app purchases, credits, or upgrades visible to students on the campus plan.',
  },
  {
    q: 'How is this different from a generic question bank?',
    a: "InterviewEra generates questions from each student's actual resume — not a shared bank. Two students applying for the same role get different questions based on their own projects and skills. Answers are scored across 5 weighted dimensions with specific, actionable feedback per answer.",
  },
] as const;

const TRUST_LOGOS = ['IIT Placement Cell', 'VIT Vellore', 'PESIT Bangalore', 'RAIT Mumbai', 'KIIT University'] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CollegeLandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/college/dashboard');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ─── Sticky nav ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Interview<span style={{ color: 'var(--accent-primary)' }}>Era</span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                color: 'var(--accent-primary)',
                border: '1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)',
              }}
            >
              Campus
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm sm:flex" style={{ color: 'var(--text-secondary)' }}>
            <a href="#how-it-works" className="transition-opacity hover:opacity-70">How it works</a>
            <a href="#pricing" className="transition-opacity hover:opacity-70">Pricing</a>
            <a href="#faq" className="transition-opacity hover:opacity-70">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium transition-opacity hover:opacity-70 sm:block" style={{ color: 'var(--text-secondary)' }}>
              Sign in
            </Link>
            <Link
              href="/college/signup"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-90"
              style={{ background: 'var(--accent-primary)' }}
            >
              Start Free Pilot
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24"
        style={{
          background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent-primary) 7%, var(--bg-primary)) 0%, var(--bg-primary) 55%)',
        }}
      >
        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(var(--card-border) 1px, transparent 1px), linear-gradient(to right, var(--card-border) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
          }}
        />

        <div className="relative mx-auto max-w-3xl">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, transparent)',
              background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            <Star className="h-3 w-3" aria-hidden />
            For T&P Officers &amp; Placement Cells
          </div>

          <h1
            className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Prepare Your Entire Batch{' '}
            <span style={{ color: 'var(--accent-primary)' }}>for Placements</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            AI Mock Interviews + T&P Analytics Dashboard — give every student unlimited practice
            and watch your entire cohort's readiness in real time.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="mailto:campus@interviewera.in?subject=Demo Request"
              className="inline-flex items-center gap-2 rounded-xl border-2 px-6 py-3 text-base font-semibold transition-all hover:-translate-y-0.5"
              style={{
                borderColor: 'var(--accent-primary)',
                background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              <Mail className="h-4 w-4" aria-hidden />
              Book Free Demo
            </Link>
            <Link
              href="/college/signup"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--accent-primary)',
                boxShadow: '0 8px 28px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
              }}
            >
              Start Free Pilot
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            3 months · 50 students · No credit card
          </p>

          {/* Social proof */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Trusted by placement cells at
            </span>
            {TRUST_LOGOS.slice(0, 3).map((name) => (
              <span key={name} className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {name}
              </span>
            ))}
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              +2 more
            </span>
          </div>
        </div>
      </section>

      {/* ─── Problem ─────────────────────────────────────────────────────────── */}
      <section
        className="border-y px-4 py-20 sm:px-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-danger, #ef4444)' }}>
              The Problem
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Why most colleges fail their students at placement time
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PAIN_POINTS.map(({ icon: Icon, stat, label, detail }) => (
              <div
                key={label}
                className="rounded-2xl p-6"
                style={{
                  background: 'color-mix(in srgb, var(--accent-danger, #ef4444) 5%, var(--card-bg))',
                  border: '1.5px solid color-mix(in srgb, var(--accent-danger, #ef4444) 15%, var(--card-border))',
                }}
              >
                <Icon className="h-6 w-6 mb-3" style={{ color: 'var(--accent-danger, #ef4444)' }} aria-hidden />
                <p className="text-3xl font-bold" style={{ color: 'var(--accent-danger, #ef4444)' }}>{stat}</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solution ────────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
              The Solution
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              One platform. Every student. Full visibility.
            </h2>
            <p className="mt-3 text-base" style={{ color: 'var(--text-secondary)' }}>
              InterviewEra Campus replaces expensive coaching with AI that scales to your entire batch.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {SOLUTION_PILLARS.map(({ icon: Icon, title, desc, accent }) => (
              <div
                key={title}
                className="rounded-2xl p-7"
                style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)' }}
              >
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
                >
                  <Icon className="h-5 w-5" style={{ color: accent }} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────────────── */}
      <section
        className="border-y px-4 py-20 sm:px-6"
        id="how-it-works"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
              How it works
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              From zero to placement-ready in 3 steps
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, time }) => (
              <div key={step} className="relative">
                <div className="mb-5 flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ background: 'var(--accent-primary)' }}
                  >
                    {step}
                  </span>
                  <Icon className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                </div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                <div
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, transparent)',
                    background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Zap className="h-3 w-3" aria-hidden />
                  {time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Dashboard preview ───────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
              T&P Dashboard
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Your entire cohort. One screen.
            </h2>
            <p className="mt-3 text-base" style={{ color: 'var(--text-secondary)' }}>
              Live stats, tier distribution, score trends, and per-student drill-down — no manual report compilation.
            </p>
          </div>

          {/* Mock dashboard UI */}
          <div
            className="overflow-hidden rounded-2xl border-2"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          >
            {/* Dashboard chrome top bar */}
            <div
              className="flex items-center justify-between border-b px-5 py-3"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>KJSCE Mumbai · Cohort Analytics</span>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: 'color-mix(in srgb, var(--accent-success, #22c55e) 14%, transparent)', color: 'var(--accent-success, #22c55e)' }}
              >
                Live
              </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0" style={{ borderColor: 'var(--card-border)' }}>
              {DASHBOARD_STATS.map(({ label, value, sub, color }) => (
                <div
                  key={label}
                  className="px-5 py-5 first:divide-x-0"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                </div>
              ))}
            </div>

            {/* Tier distribution bar */}
            <div className="border-t px-5 py-5" style={{ borderColor: 'var(--card-border)' }}>
              <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tier Distribution — Batch of 148</p>
              <div className="space-y-3">
                {DASHBOARD_TIER_BARS.map(({ tier, pct, color }) => (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 text-xs" style={{ color: 'var(--text-secondary)' }}>{tier}</span>
                    <div className="flex-1 overflow-hidden rounded-full" style={{ height: 8, background: 'var(--bg-secondary)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Callout features strip */}
            <div
              className="grid grid-cols-1 gap-0 divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
            >
              {[
                { icon: FileSpreadsheet, label: 'Export full cohort CSV in one click' },
                { icon: Calendar, label: 'Set placement deadlines with auto-reminders' },
                { icon: ShieldCheck, label: 'Per-student detail — scores, tier, history' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 px-5 py-3.5">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────────────── */}
      <section
        className="border-y px-4 py-20 sm:px-6"
        id="pricing"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
              Pricing
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Transparent annual pricing
            </h2>
            <p className="mt-3 text-base" style={{ color: 'var(--text-secondary)' }}>
              Billed once per academic year. No per-student overage. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className="relative flex flex-col rounded-2xl p-7"
                style={{
                  background: 'var(--card-bg)',
                  border: plan.highlight ? '2px solid var(--accent-primary)' : '1.5px solid var(--card-border)',
                  boxShadow: plan.highlight ? '0 8px 36px color-mix(in srgb, var(--accent-primary) 16%, transparent)' : undefined,
                }}
              >
                {'badge' in plan && (
                  <span
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold text-white"
                    style={{ background: 'var(--accent-primary)' }}
                  >
                    {plan.badge}
                  </span>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>{plan.name}</p>
                  <p className="mt-2 text-4xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {plan.price}
                    <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{plan.seats}</p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent-success, #22c55e)' }} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.cta.href}
                  className="mt-8 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={
                    plan.highlight
                      ? { background: 'var(--accent-primary)', color: '#fff' }
                      : {
                          border: '1.5px solid var(--card-border)',
                          background: 'transparent',
                          color: 'var(--text-primary)',
                        }
                  }
                >
                  {plan.cta.label}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Need a custom quote for 500+ students?{' '}
            <a href="mailto:campus@interviewera.in" className="font-medium hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Talk to our team →
            </a>
          </p>
        </div>
      </section>

      {/* ─── Pilot offer ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div
            className="overflow-hidden rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
            }}
          >
            <div className="px-8 py-12 text-center text-white">
              <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]">
                Limited Time · Free Pilot
              </span>
              <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
                Try it free for 3 months
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base text-white/85 leading-relaxed">
                50 students · Full platform access · No credit card required.
                We set up your campus, invite your first batch, and show you the dashboard — at zero cost.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { stat: '3 months', label: 'Free access' },
                  { stat: '50', label: 'Student seats' },
                  { stat: '₹0', label: 'No card needed' },
                  { stat: '<10 min', label: 'Setup time' },
                ].map(({ stat, label }) => (
                  <div key={label} className="rounded-xl bg-white/10 px-3 py-3">
                    <p className="text-xl font-bold">{stat}</p>
                    <p className="mt-0.5 text-xs text-white/75">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/college/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Start Free Pilot
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href="mailto:campus@interviewera.in?subject=Demo Request"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-white/20"
                >
                  Book a Demo Call
                </a>
              </div>

              <p className="mt-5 text-xs text-white/60">
                Already running a pilot?{' '}
                <Link href="/login" className="underline underline-offset-2 hover:text-white/90">Sign in here</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────────────── */}
      <section
        className="border-t px-4 py-20 sm:px-6"
        id="faq"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
              FAQ
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Common questions
            </h2>
          </div>

          <div
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          >
            {FAQS.map((item, i) => (
              <details
                key={item.q}
                className="group border-t"
                style={{ borderColor: i === 0 ? 'transparent' : 'var(--card-border)' }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-sm font-semibold select-none"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.q}
                  <ChevronRight
                    className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-90"
                    style={{ color: 'var(--accent-primary)' }}
                    aria-hidden
                  />
                </summary>
                <div
                  className="px-6 pb-5 pt-0 text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contact ─────────────────────────────────────────────────────────── */}
      <section className="border-t px-4 py-20 sm:px-6" style={{ borderColor: 'var(--card-border)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Left — copy */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
                Get in touch
              </p>
              <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Let's talk placement strategy
              </h2>
              <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Whether you want a live demo, a custom quote, or just want to understand if InterviewEra fits your college — we're happy to hop on a 30-minute call.
              </p>

              <div className="mt-8 space-y-4">
                <a
                  href="mailto:campus@interviewera.in"
                  className="flex items-center gap-3 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' }}
                  >
                    <Mail className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                  </span>
                  campus@interviewera.in
                </a>
                <a
                  href="tel:+918000000000"
                  className="flex items-center gap-3 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' }}
                  >
                    <Phone className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                  </span>
                  +91 80000 00000
                </a>
              </div>

              {/* Trust counters */}
              <div
                className="mt-10 rounded-2xl border p-5"
                style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
              >
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { val: '28', label: 'students active' },
                    { val: '5', label: 'colleges interested' },
                    { val: '3', label: 'pilots running' },
                  ].map(({ val, label }) => (
                    <div key={label}>
                      <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>{val}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — CTA card */}
            <div
              className="flex flex-col justify-center rounded-2xl p-8"
              style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)' }}
            >
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Book a free 30-min demo
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                We'll walk through the T&P dashboard live, answer your questions, and set up a free pilot if you want to go ahead — all in one call.
              </p>

              <ul className="mt-6 space-y-2.5">
                {[
                  'Live dashboard walkthrough',
                  'Sample cohort report',
                  'Custom pilot setup',
                  'Q&A with our team',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-success, #22c55e)' }} aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3">
                <a
                  href="mailto:campus@interviewera.in?subject=Demo Request — College Landing"
                  className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'var(--accent-primary)',
                    boxShadow: '0 6px 20px color-mix(in srgb, var(--accent-primary) 28%, transparent)',
                  }}
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  Book Demo via Email
                </a>
                <Link
                  href="/college/signup"
                  className="flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Users className="h-4 w-4" aria-hidden />
                  Start Free Pilot Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        className="border-t px-4 py-8 text-center text-xs sm:px-6"
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
      >
        <p>
          © {new Date().getFullYear()} InterviewEra &nbsp;·&nbsp;
          <Link href="/privacy" className="hover:opacity-70">Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms" className="hover:opacity-70">Terms</Link>
          &nbsp;·&nbsp;
          <Link href="/pricing" className="hover:opacity-70">Pricing</Link>
          &nbsp;·&nbsp;
          <Link href="/" className="hover:opacity-70">Home</Link>
        </p>
      </footer>

    </div>
  );
}
