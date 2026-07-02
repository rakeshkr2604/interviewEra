import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { createClient } from '@/lib/supabase/server';
import { generateMetadata } from '@/lib/seo/metadata';
import {
  ArrowRight,
  BarChart2,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  Phone,
  Search,
  TrendingDown,
  Upload,
  Wallet,
} from 'lucide-react';

export const metadata = generateMetadata({
  title: 'InterviewEra for Colleges | AI Mock Interviews + T&P Dashboard',
  description:
    'Prepare your entire batch for placements. AI mock interviews + real-time analytics for ₹500–1,000 per student. Free 3-month pilot for 50 students.',
  path: '/college',
  keywords: ['campus placement', 'T&P dashboard', 'mock interview platform', 'college placement training', 'AI mock interview for colleges', 'placement cell software India'],
});

// ─── Static data ───────────────────────────────────────────────────────────────

const HERO_BULLETS = [
  'Bulk student onboarding via CSV upload',
  'Real-time T&P dashboard — live progress tracking',
  '60–75% cost savings vs traditional coaching',
] as const;

const PROBLEMS = [
  {
    icon: Wallet,
    tag: 'Too Expensive',
    headline: "₹5,000 per student. For 100 students, that's ₹5,00,000.",
    body: "Traditional GD/PI coaching charges per student, per round. Most colleges can't afford it. Most students skip it entirely.",
  },
  {
    icon: Search,
    tag: 'Zero Visibility',
    headline: 'You have no idea who is actually practising.',
    body: 'No data. No tracking. No deadlines. You find out a student was underprepared only after the company rejects them.',
  },
  {
    icon: TrendingDown,
    tag: 'Poor Outcomes',
    headline: 'Students wing it. Low placement rates hurt everyone.',
    body: "Without structured practice, students fail interviews. There's no systematic way to improve batch-level outcomes year over year.",
  },
] as const;

const SOLUTION_BENEFITS = [
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'See exactly who is practising, who is improving, and who is falling behind. Tier distribution, score trends, session activity — all live.',
  },
  {
    icon: Calendar,
    title: 'Set Deadlines & Track Progress',
    desc: 'Requirement: 5 sessions by March 1st. Track completion in real time. Auto-flag laggards. Send reminders. Hold students accountable.',
  },
  {
    icon: Upload,
    title: 'Bulk Onboarding in Minutes',
    desc: 'Upload CSV of student emails. We send invite links. Students sign up and get access. Entire batch onboarded in under 10 minutes.',
  },
  {
    icon: Wallet,
    title: 'Save 60–75% vs Coaching',
    desc: '₹500–1,000 per student for unlimited practice vs ₹5,000 for 5 sessions at a coaching centre. Same quality. Fraction of the cost.',
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Upload,
    title: 'Upload & Invite',
    time: '5 minutes',
    desc: 'Upload your student roll as a CSV. We send personalised invite links instantly. Students create accounts and get immediate access — no IT setup required.',
    mockLabel: 'Bulk Invite — 148 emails queued',
  },
  {
    step: '02',
    icon: MessageSquare,
    title: 'Students Practice Unlimited',
    time: '15–25 min per session',
    desc: 'Students get AI mock interviews built from their own resume. Instant feedback on communication, technical depth, and STAR structure. Available 24×7.',
    mockLabel: 'Session in progress — Q3 of 6',
  },
  {
    step: '03',
    icon: BarChart2,
    title: 'Track & Improve',
    time: 'Live — no manual reports',
    desc: 'Monitor progress from your T&P dashboard. Set deadlines. Identify placement-ready students. Export cohort reports for your placement committee.',
    mockLabel: 'Analytics — 30-day view',
  },
] as const;

const PRICING = [
  {
    name: 'Tier-3 College',
    price: '₹49,999',
    period: '/year',
    seats: '50–100 students',
    perStudent: '≈ ₹500–1,000 per student',
    highlight: false,
    cta: { label: 'Set up Campus Workspace', href: '/signup?intent=college' },
    features: [
      'Up to 100 student seats',
      'Unlimited AI mock interviews',
      'Full T&P dashboard',
      'CSV bulk invite',
      'Deadline tracking & analytics',
      'Email support (48h SLA)',
    ],
  },
  {
    name: 'Tier-2 College',
    price: '₹99,999',
    period: '/year',
    seats: '100–200 students',
    perStudent: '≈ ₹500–1,000 per student',
    badge: 'Most Popular',
    highlight: true,
    cta: { label: 'Set up Campus Workspace', href: '/signup?intent=college' },
    features: [
      'Up to 200 student seats',
      'Everything in Tier-3',
      'Priority support (12h SLA)',
      'Custom college branding',
      'Auto-reminder emails',
      'Per-student drill-down reports',
    ],
  },
  {
    name: 'Premium',
    price: '₹1,99,999',
    period: '/year',
    seats: '200+ students',
    perStudent: 'Unlimited seats',
    highlight: false,
    cta: { label: 'Contact Sales', href: 'mailto:campus@interviewera.in' },
    features: [
      'Unlimited student seats',
      'Everything in Tier-2',
      'White-label / custom domain',
      'API access for ERP integration',
      'Dedicated account manager',
      'On-site training session',
    ],
  },
] as const;

const PILOT_CHECKLIST = [
  'Up to 50 students — full platform access',
  'Complete T&P dashboard with analytics',
  'Deadline tracking and auto-reminders',
  'Email support throughout the pilot',
  'Weekly check-in call with our team',
] as const;

const FAQS = [
  {
    q: 'How long does setup take?',
    a: '10–15 minutes end-to-end. Upload your student CSV, we send invite links, students sign up. You start tracking immediately. No IT team needed.',
  },
  {
    q: "What if students don't use it?",
    a: "Set a deadline — '5 sessions by March 1st'. Track completion in real time. The dashboard flags who hasn't started. You send reminders. Students stay accountable.",
  },
  {
    q: 'Is this better than traditional coaching?',
    a: 'Same quality feedback — AI-powered, rubric-scored across 5 dimensions — but unlimited practice vs 5 sessions at a coaching centre. And 75% cheaper.',
  },
  {
    q: 'What happens after the pilot?',
    a: "If you see value, move to a paid annual plan. If not, walk away. Zero obligation, zero automatic billing. Your student data is yours to export any time.",
  },
  {
    q: 'Can we customise it for our college?',
    a: 'Yes. Premium plans include white-labelling, custom branding in invite emails, API access for ERP integration, and a dedicated account manager.',
  },
  {
    q: 'Do students need to pay anything?',
    a: 'No. Your college pays once per year. Students get completely free, unlimited access for the full academic year. No in-app purchases, no credits.',
  },
] as const;

// ─── Mock dashboard sub-components (coded UI, no screenshots needed) ──────────

function MockDashboardHero() {
  return (
    <div
      className="college-mock-dashboard w-full overflow-hidden rounded-2xl border-2 shadow-2xl"
      style={{ borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))', background: 'var(--card-bg)' }}
      aria-hidden="true"
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between border-b px-4 py-2.5"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: 'var(--accent-primary)' }}
          >
            <BarChart2 className="h-3 w-3 text-white" />
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>T&P Dashboard — KJSCE Mumbai</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: 'color-mix(in srgb, var(--accent-success) 14%, transparent)', color: 'var(--accent-success)' }}
        >
          LIVE
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: 'var(--card-border)' }}>
        {[
          { label: 'Students Enrolled', value: '148', color: 'var(--accent-link)' },
          { label: 'Placement Ready', value: '63', color: 'var(--accent-success)' },
          { label: 'Avg. Score', value: '6.8/10', color: '#8b5cf6' },
          { label: 'Sessions This Week', value: '94', color: '#06b6d4' },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mini tier bar */}
      <div className="border-t px-4 py-3" style={{ borderColor: 'var(--card-border)' }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Tier Distribution</p>
        <div className="space-y-1.5">
          {[
            { tier: 'Tier 4 — Mock Panel', pct: 8, color: '#f59e0b' },
            { tier: 'Tier 3 — Company Patterns', pct: 34, color: '#8b5cf6' },
            { tier: 'Tier 2 — Advanced', pct: 41, color: 'var(--accent-link)' },
            { tier: 'Tier 1 — Fundamentals', pct: 17, color: 'var(--text-muted)' },
          ].map(({ tier, pct, color }) => (
            <div key={tier} className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-[10px]" style={{ color: 'var(--text-secondary)' }}>{tier}</span>
              <div className="flex-1 overflow-hidden rounded-full" style={{ height: 5, background: 'var(--bg-secondary)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="w-6 text-right text-[10px] font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Student list preview */}
      <div className="border-t" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--bg-secondary)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Recent Students</span>
          <span className="text-[10px]" style={{ color: 'var(--accent-link)' }}>View all 148 →</span>
        </div>
        {[
          { name: 'Priya Sharma', sessions: 7, score: '7.4', tier: 'T3', ready: true },
          { name: 'Arjun Mehta', sessions: 3, score: '5.8', tier: 'T1', ready: false },
          { name: 'Sneha Patel', sessions: 9, score: '8.1', tier: 'T4', ready: true },
        ].map(({ name, sessions, score, tier, ready }) => (
          <div key={name} className="flex items-center justify-between border-t px-4 py-2" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: 'var(--accent-primary)' }}>
                {name[0]}
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{name}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span>{sessions} sessions</span>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{score}/10</span>
              <span
                className="rounded-full px-1.5 py-0.5 font-bold"
                style={{
                  background: ready
                    ? 'color-mix(in srgb, var(--accent-success) 12%, transparent)'
                    : 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
                  color: ready ? 'var(--accent-success)' : 'var(--text-muted)',
                }}
              >
                {tier}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function CollegeLandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/college/dashboard');

  return (
    <main id="main-content" className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── SECTION 1: Hero ───────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24"
        style={{
          background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent-primary) 8%, var(--bg-primary)) 0%, var(--bg-primary) 60%)',
        }}
      >
        {/* Grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'linear-gradient(var(--card-border) 1px, transparent 1px), linear-gradient(to right, var(--card-border) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, black, transparent)',
          }}
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left — copy */}
          <div>
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, transparent)',
                background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                color: 'var(--accent-link)',
              }}
            >
              For T&amp;P Officers &amp; Placement Cells
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl" style={{ color: 'var(--text-primary)' }}>
              Prepare Your Entire Batch{' '}
              <span style={{ color: 'var(--accent-link)' }}>for Placements</span>
            </h1>

            <p className="mt-5 text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              AI-powered mock interviews + real-time analytics dashboard. Track every student&apos;s progress,
              identify placement-ready candidates — all for{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹500–1,000 per student</span>.
            </p>

            <ul className="mt-7 space-y-3">
              {HERO_BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--accent-link)' }} aria-hidden />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedCtaLink
                href="/signup?intent=college"
                ctaKey={CTA_KEYS.CAMPUS_WORKSPACE}
                ctaText="Set up Campus Workspace"
                section="college_hero"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-white transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--accent-primary)',
                  boxShadow: '0 10px 32px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
                }}
              >
                Set up Campus Workspace
                <ArrowRight className="h-4 w-4" aria-hidden />
              </TrackedCtaLink>
              <a
                href="mailto:campus@interviewera.in?subject=Demo Request"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 px-7 py-3.5 text-base font-semibold transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-primary)',
                  background: 'var(--card-bg)',
                }}
              >
                Book 15-Min Demo
              </a>
            </div>

            <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              50 students &nbsp;·&nbsp; 3 months &nbsp;·&nbsp; No credit card
            </p>
            <div
              className="mt-4 rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Are you a student?
              </p>
              <Link
                href="/help-center"
                className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-link)' }}
              >
                Student Invitation
              </Link>
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Students join using the invite email their college sends — check your inbox for the link.
              </p>
            </div>
          </div>

          {/* Right — mock dashboard */}
          <div className="hidden lg:block">
            <MockDashboardHero />
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Problem ────────────────────────────────────────────────── */}
      <section
        className="border-y px-4 py-20 sm:px-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-danger)' }}>
              The Problem
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              The Placement Prep Problem
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PROBLEMS.map(({ icon: Icon, tag, headline, body }) => (
              <div
                key={tag}
                className="rounded-2xl p-7"
                style={{
                  background: 'color-mix(in srgb, var(--accent-danger) 5%, var(--card-bg))',
                  border: '1.5px solid color-mix(in srgb, var(--accent-danger) 18%, var(--card-border))',
                }}
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'color-mix(in srgb, var(--accent-danger) 12%, transparent)' }}
                >
                  <Icon className="h-5 w-5" style={{ color: 'var(--accent-danger)' }} aria-hidden />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--accent-danger)' }}>{tag}</p>
                <p className="mt-2 text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{headline}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Solution ───────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6" id="solution">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-link)' }}>
              The Solution
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              How InterviewEra Solves This
            </h2>
          </div>

          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
            {/* Left — mock full dashboard */}
            <div className="hidden lg:block">
              <MockDashboardHero />
            </div>

            {/* Right — 4 benefits */}
            <div className="space-y-7">
              {SOLUTION_BENEFITS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-5">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: 'var(--accent-link)' }} aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: How It Works ───────────────────────────────────────────── */}
      <section
        className="border-y px-4 py-20 sm:px-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-link)' }}>
              Simple Setup
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Get Your Batch Placement-Ready in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, time, desc, mockLabel }) => (
              <div key={step}>
                {/* Mock UI placeholder */}
                <div
                  className="college-mock-dashboard mb-5 overflow-hidden rounded-xl border"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                  aria-hidden="true"
                >
                  <div
                    className="flex items-center justify-between border-b px-3 py-2"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white"
                        style={{ background: 'var(--accent-primary)' }}
                      >
                        {step}
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{mockLabel}</span>
                    </div>
                    <Icon className="h-3.5 w-3.5" style={{ color: 'var(--accent-link)' }} aria-hidden />
                  </div>
                  <div className="space-y-1.5 p-3">
                    {[70, 50, 85, 40].map((w, i) => (
                      <div
                        key={i}
                        className="h-2 rounded-full"
                        style={{
                          width: `${w}%`,
                          background: i % 2 === 0
                            ? 'color-mix(in srgb, var(--accent-primary) 25%, transparent)'
                            : 'var(--bg-secondary)',
                        }}
                      />
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-5 w-16 rounded" style={{ background: 'var(--accent-primary)' }} />
                      <div className="h-5 w-12 rounded border" style={{ borderColor: 'var(--card-border)' }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ background: 'var(--accent-primary)' }}
                  >
                    {step}
                  </span>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    <span
                      className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold"
                      style={{ color: 'var(--accent-link)' }}
                    >
                      <Clock className="h-3 w-3" aria-hidden />
                      {time}
                    </span>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: Dashboard Preview ─────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-link)' }}>
              T&amp;P Dashboard
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Your T&amp;P Dashboard — Full Visibility
            </h2>
            <p className="mt-3 text-base" style={{ color: 'var(--text-secondary)' }}>
              Track progress, set deadlines, identify laggards — all in one place.
            </p>
          </div>

          {/* Full mock dashboard */}
          <div
            className="college-mock-dashboard overflow-hidden rounded-2xl border-2 shadow-xl"
            style={{ borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, var(--card-border))', background: 'var(--card-bg)' }}
            aria-hidden="true"
          >
            {/* Chrome bar */}
            <div
              className="flex items-center justify-between border-b px-5 py-3"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ background: 'var(--accent-primary)' }}
                >
                  <BarChart2 className="h-3.5 w-3.5 text-white" />
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>KJSCE Mumbai · Cohort Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{ background: 'color-mix(in srgb, var(--accent-success) 14%, transparent)', color: 'var(--accent-success)' }}
                >
                  Live
                </span>
                <span
                  className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-medium"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                >
                  <FileSpreadsheet className="h-3 w-3" aria-hidden />
                  Export CSV
                </span>
              </div>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-2 divide-x divide-y border-b sm:grid-cols-4 sm:divide-y-0" style={{ borderColor: 'var(--card-border)' }}>
              {[
                { label: 'Students Enrolled', value: '148', sub: 'of 200 seats', color: 'var(--accent-link)' },
                { label: 'Placement Ready', value: '63', sub: '42% of batch', color: 'var(--accent-success)' },
                { label: 'Avg. Score', value: '6.8', sub: 'out of 10', color: '#8b5cf6' },
                { label: 'Sessions This Week', value: '94', sub: '↑ 31% vs last week', color: '#06b6d4' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="px-5 py-4" style={{ borderColor: 'var(--card-border)' }}>
                  <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                </div>
              ))}
            </div>

            {/* Two column — charts + student list */}
            <div className="grid grid-cols-1 divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0" style={{ borderColor: 'var(--card-border)' }}>
              {/* Tier bars */}
              <div className="p-5 lg:col-span-1">
                <p className="mb-4 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Tier Distribution</p>
                <div className="space-y-3">
                  {[
                    { tier: 'Tier 4 — Mock Panel', pct: 8, color: '#f59e0b' },
                    { tier: 'Tier 3 — Company', pct: 34, color: '#8b5cf6' },
                    { tier: 'Tier 2 — Advanced', pct: 41, color: 'var(--accent-link)' },
                    { tier: 'Tier 1 — Fundamentals', pct: 17, color: 'var(--text-muted)' },
                  ].map(({ tier, pct, color }) => (
                    <div key={tier} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 text-xs" style={{ color: 'var(--text-secondary)' }}>{tier}</span>
                      <div className="flex-1 overflow-hidden rounded-full" style={{ height: 6, background: 'var(--bg-secondary)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="w-7 text-right text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                  ))}
                </div>

                {/* Deadline card */}
                <div
                  className="mt-5 rounded-xl border p-3"
                  style={{ borderColor: 'color-mix(in srgb, #f59e0b 25%, var(--card-border))', background: 'color-mix(in srgb, #f59e0b 6%, transparent)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} aria-hidden />
                    <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Upcoming Deadline</p>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>5 sessions by March 1st</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>34 students not yet on track</p>
                </div>
              </div>

              {/* Student list */}
              <div className="lg:col-span-2">
                <div
                  className="flex items-center justify-between border-b px-5 py-3"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
                >
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Students</p>
                  <div
                    className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px]"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
                  >
                    <Search className="h-3 w-3" aria-hidden />
                    Search by name, email…
                  </div>
                </div>
                <table className="w-full text-xs">
                  <thead style={{ background: 'var(--bg-secondary)' }}>
                    <tr>
                      {['Name', 'Sessions', 'Avg Score', 'Tier', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Priya Sharma', s: 7, score: '7.4', tier: 'T3', status: 'On Track', ok: true },
                      { name: 'Arjun Mehta', s: 1, score: '4.2', tier: 'T1', status: 'At Risk', ok: false },
                      { name: 'Sneha Patel', s: 9, score: '8.1', tier: 'T4', status: 'Ready', ok: true },
                      { name: 'Rohan Verma', s: 3, score: '5.6', tier: 'T2', status: 'On Track', ok: true },
                    ].map(({ name, s, score, tier, status, ok }) => (
                      <tr key={name} className="border-t" style={{ borderColor: 'var(--card-border)' }}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{name}</td>
                        <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s}</td>
                        <td className="px-4 py-2.5 font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{score}</td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>{tier}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className="rounded-full px-2 py-0.5 font-semibold"
                            style={{
                              background: ok
                                ? 'color-mix(in srgb, var(--accent-success) 12%, transparent)'
                                : 'color-mix(in srgb, var(--accent-danger) 12%, transparent)',
                              color: ok ? 'var(--accent-success)' : 'var(--accent-danger)',
                            }}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: Pricing ────────────────────────────────────────────────── */}
      <section
        className="border-y px-4 py-20 sm:px-6"
        id="pricing"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-link)' }}>
              Pricing
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Pricing That Makes Sense for Colleges
            </h2>
            <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
              Annual plans. No per-student overage. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className="relative flex flex-col rounded-2xl p-7"
                style={{
                  background: 'var(--card-bg)',
                  border: plan.highlight
                    ? '2px solid var(--accent-primary)'
                    : '1.5px solid var(--card-border)',
                  boxShadow: plan.highlight
                    ? '0 10px 40px color-mix(in srgb, var(--accent-primary) 16%, transparent)'
                    : undefined,
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
                    <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{plan.seats}</p>
                  <p
                    className="mt-1 text-xs font-semibold"
                    style={{ color: 'var(--accent-link)' }}
                  >
                    {plan.perStudent}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.cta.href.startsWith('mailto:') ? (
                  <a
                    href={plan.cta.href}
                    className="mt-8 block min-h-[44px] rounded-xl px-4 py-3 text-center text-sm font-bold transition-all hover:-translate-y-0.5"
                    style={{ border: '1.5px solid var(--card-border)', color: 'var(--text-primary)' }}
                  >
                    {plan.cta.label}
                  </a>
                ) : (
                  <TrackedCtaLink
                    href={plan.cta.href}
                    ctaKey={CTA_KEYS.CAMPUS_WORKSPACE}
                    ctaText={plan.cta.label}
                    section="college_pricing"
                    className="mt-8 block min-h-[44px] rounded-xl px-4 py-3 text-center text-sm font-bold transition-all hover:-translate-y-0.5"
                    style={
                      plan.highlight
                        ? { background: 'var(--accent-primary)', color: '#fff' }
                        : { border: '1.5px solid var(--card-border)', color: 'var(--text-primary)' }
                    }
                  >
                    {plan.cta.label}
                  </TrackedCtaLink>
                )}
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            All plans include unlimited interviews for students. &nbsp;
            <span style={{ color: 'var(--accent-link)' }}>₹500–1,000/student</span> vs ₹5,000 for traditional coaching.
          </p>
        </div>
      </section>

      {/* ── SECTION 7: Pilot Offer ────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div
            className="overflow-hidden rounded-3xl"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)' }}
          >
            <div className="grid grid-cols-1 gap-0 divide-y md:grid-cols-2 md:divide-x md:divide-y-0" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
              {/* Left */}
              <div className="px-8 py-10">
                <span className="inline-block rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">
                  Free Pilot
                </span>
                <h2 className="mt-5 text-3xl font-bold text-white">
                  Start With a Free 3-Month Pilot
                </h2>
                <p className="mt-3 text-base text-white/80">
                  See results before you commit. No credit card required.
                </p>
                <ul className="mt-6 space-y-3">
                  {PILOT_CHECKLIST.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-white/90">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-white" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right */}
              <div className="px-8 py-10">
                <p className="text-sm font-bold uppercase tracking-wide text-white/70">How it works</p>
                <ol className="mt-4 space-y-4">
                  {[
                    'Book a 15-min demo — we show you the dashboard live.',
                    'Send us your student CSV — we send invite links to your batch.',
                    'Track progress for 3 months — we help you get results.',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <p className="text-sm text-white/85 leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 text-xs text-white/60">
                  After pilot: choose to continue or walk away. Zero obligation.
                </p>
                <div className="mt-7 flex flex-col gap-3">
                  <a
                    href="mailto:campus@interviewera.in?subject=Pilot Demo Request"
                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Book Your Pilot Demo
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                  <TrackedCtaLink
                    href="/signup?intent=college"
                    ctaKey={CTA_KEYS.CAMPUS_WORKSPACE}
                    ctaText="Set up Campus Workspace"
                    section="college_pilot"
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/20"
                  >
                    Set up Campus Workspace
                  </TrackedCtaLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8: Social Proof ───────────────────────────────────────────── */}
      <section
        className="border-y px-4 py-16 sm:px-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Trusted by Colleges &amp; Students
          </h2>

          <div className="mt-8 grid grid-cols-3 gap-6 sm:gap-10">
            {[
              { val: '28', label: 'Students practising' },
              { val: '5', label: 'Colleges in pilot talks' },
              { val: '7.8/10', label: 'Avg score improvement' },
            ].map(({ val, label }) => (
              <div key={label}>
                <p className="text-4xl font-bold" style={{ color: 'var(--accent-link)' }}>{val}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>

          <div
            className="mx-auto mt-10 max-w-xl rounded-2xl border p-6"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          >
            <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              &ldquo;Currently in early pilot with 5 colleges across India.
              Join now and help shape the product — early partners get locked-in pricing and priority support.&rdquo;
            </p>
            <p className="mt-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              — InterviewEra Team
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: FAQ ────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6" id="faq">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-link)' }}>
              FAQ
            </p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Common Questions
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
                    style={{ color: 'var(--accent-link)' }}
                    aria-hidden
                  />
                </summary>
                <div
                  className="px-6 pb-5 text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 10: Final CTA ─────────────────────────────────────────────── */}
      <section
        className="px-4 py-20 text-center sm:px-6"
        style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)' }}
      >
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-indigo-300">
            Ready to get started?
          </p>
          <h2 className="text-4xl font-bold text-white">
            Ready to Prepare Your Batch for Placements?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-indigo-200">
            Start with a free 3-month pilot. 50 students. No credit card.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="mailto:campus@interviewera.in?subject=Pilot Demo Request"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{ color: 'var(--accent-primary)' }}
            >
              Book Free Pilot Demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <TrackedCtaLink
              href="/signup?intent=college"
              ctaKey={CTA_KEYS.CAMPUS_WORKSPACE}
              ctaText="Set up Campus Workspace"
              section="college_final_cta"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-indigo-400/50 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/20"
            >
              Set up Campus Workspace
            </TrackedCtaLink>
          </div>

          <div className="mt-10 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
            <a
              href="mailto:campus@interviewera.in"
              className="flex items-center gap-2 text-sm text-indigo-300 transition-opacity hover:opacity-80"
            >
              <Mail className="h-4 w-4" aria-hidden />
              campus@interviewera.in
            </a>
            <span className="hidden text-indigo-600 sm:block">|</span>
            <a
              href="tel:+919709999477"
              className="flex items-center gap-2 text-sm text-indigo-300 transition-opacity hover:opacity-80"
            >
              <Phone className="h-4 w-4" aria-hidden />
              +91 97099 99477
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer
        className="college-site-footer border-t px-4 py-8 text-center text-xs"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <p>
          © {new Date().getFullYear()} InterviewEra &nbsp;·&nbsp;
          <Link href="/privacy" className="underline-offset-2 hover:underline">Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms" className="underline-offset-2 hover:underline">Terms</Link>
          &nbsp;·&nbsp;
          <Link href="/pricing" className="underline-offset-2 hover:underline">Pricing</Link>
          &nbsp;·&nbsp;
          <Link href="/" className="underline-offset-2 hover:underline">Home</Link>
          &nbsp;·&nbsp;
          <Link href="/campus" className="underline-offset-2 hover:underline">Campus Info</Link>
        </p>
      </footer>

    </main>
  );
}
