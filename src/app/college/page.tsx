import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { generateMetadata } from '@/lib/seo/metadata';
import {
  Users,
  BarChart2,
  Mail,
  ShieldCheck,
  TrendingUp,
  Calendar,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export const metadata = generateMetadata({
  title: 'Campus Placement Training Platform for Colleges',
  description:
    'InterviewEra Campus — AI mock interviews for your entire batch. T&P officers get a dedicated dashboard, bulk invites, analytics, and placement-readiness tracking.',
  path: '/college',
});

const PRICING = [
  {
    name: 'Tier-3',
    price: '₹49,999',
    period: '/year',
    seats: '50–100 students',
    features: [
      'Up to 100 student seats',
      'Unlimited AI mock interviews',
      'Bulk CSV invite',
      'Basic cohort analytics',
      'Email support',
    ],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Tier-2',
    price: '₹99,999',
    period: '/year',
    seats: '100–200 students',
    features: [
      'Up to 200 student seats',
      'Unlimited AI mock interviews',
      'Bulk CSV invite + reminders',
      'Advanced analytics & trends',
      'Placement deadline tracking',
      'Priority support',
    ],
    cta: 'Most Popular',
    highlight: true,
  },
  {
    name: 'Premium',
    price: '₹1,99,999',
    period: '/year',
    seats: '200+ students',
    features: [
      'Unlimited student seats',
      'Unlimited AI mock interviews',
      'Cohort leaderboard',
      'Custom branding',
      'Dedicated account manager',
      'API access',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
] as const;

const FEATURES = [
  {
    icon: Mail,
    title: 'Bulk Invite via CSV',
    desc: 'Upload your student list and send personalised invite emails in one click.',
  },
  {
    icon: BarChart2,
    title: 'Cohort Analytics',
    desc: 'Track tier distribution, score trends, session activity, and placement readiness across your batch.',
  },
  {
    icon: Calendar,
    title: 'Deadline Management',
    desc: 'Set milestone targets (sessions, tier, score) and auto-remind students who are falling behind.',
  },
  {
    icon: TrendingUp,
    title: 'AI-Powered Interviews',
    desc: 'Resume-aware questions with 5-dimension rubric scoring — not a generic question bank.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    desc: 'T&P officers get a dedicated admin console; students see only their own progress.',
  },
  {
    icon: Users,
    title: 'Per-Student Drill-Down',
    desc: 'View interview history, scores, tier progress, and streak data for any student.',
  },
] as const;

const VALUE_PROPS = [
  {
    stat: '4×',
    label: 'more interviews per student vs. manual mock sessions',
  },
  {
    stat: '< 2 min',
    label: 'to invite 200 students with a CSV upload',
  },
  {
    stat: '5',
    label: 'scoring dimensions per answer — not just a number',
  },
  {
    stat: '100%',
    label: 'online — no scheduling, no room booking',
  },
] as const;

export default async function CollegeLandingPage() {
  // Redirect logged-in campus admins straight to their dashboard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Let the dashboard layout handle the campus_admin check
    redirect('/college/dashboard');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Interview<span style={{ color: 'var(--accent-primary)' }}>Era</span>
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              Campus
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign In
            </Link>
            <Link
              href="/college/signup"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)' }}
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        className="px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24"
        style={{
          background: 'linear-gradient(to bottom, color-mix(in srgb, var(--accent-primary) 6%, var(--bg-primary)), var(--bg-primary))',
        }}
      >
        <div className="mx-auto max-w-3xl">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
              border: '1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)',
            }}
          >
            For T&P Officers &amp; Placement Cells
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl" style={{ color: 'var(--text-primary)' }}>
            Prepare Your Entire Batch{' '}
            <span style={{ color: 'var(--accent-primary)' }}>for Placements</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg" style={{ color: 'var(--text-secondary)' }}>
            Give every student unlimited AI mock interviews, rubric-scored feedback, and a clear
            path to placement readiness — all managed from one dashboard.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/college/signup"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{
                background: 'var(--accent-primary)',
                boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-primary) 28%, transparent)',
              }}
            >
              Sign Up for Your College
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/campus"
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-base font-semibold transition-colors hover:opacity-80"
              style={{
                borderColor: 'var(--card-border)',
                background: 'var(--card-bg)',
                color: 'var(--text-secondary)',
              }}
            >
              Book a Demo
            </Link>
          </div>
          <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            No credit card required · Setup in under 5 minutes
          </p>
        </div>
      </section>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <section
        className="border-y px-4 py-10 sm:px-6"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {VALUE_PROPS.map((v) => (
            <div key={v.label}>
              <p className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>{v.stat}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{v.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Everything a T&P cell needs
          </h2>
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
            From bulk onboarding to individual progress tracking — in one platform.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl p-6 transition-shadow hover:shadow-md"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
              }}
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' }}
              >
                <Icon className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
              </span>
              <h3 className="mt-4 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6" style={{ background: 'var(--bg-secondary)' }} id="pricing">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Transparent pricing</h2>
            <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
              Annual plans — billed once per academic year. No per-student overage fees.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className="relative rounded-2xl p-7"
                style={{
                  background: 'var(--card-bg)',
                  border: plan.highlight
                    ? '2px solid var(--accent-primary)'
                    : '1px solid var(--card-border)',
                  boxShadow: plan.highlight
                    ? '0 8px 32px color-mix(in srgb, var(--accent-primary) 16%, transparent)'
                    : undefined,
                }}
              >
                {plan.highlight && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: 'var(--accent-primary)' }}
                  >
                    Most Popular
                  </span>
                )}
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{plan.name}</p>
                <p className="mt-2 text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {plan.price}
                  <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{plan.seats}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent-success)' }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.name === 'Premium' ? '/campus' : '/college/signup'}
                  className="mt-8 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-opacity hover:opacity-90"
                  style={
                    plan.highlight
                      ? { background: 'var(--accent-primary)', color: '#fff' }
                      : {
                          border: '1px solid var(--card-border)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                        }
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Need a custom quote?{' '}
            <Link href="/campus" className="hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Talk to our team
            </Link>
          </p>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────────────────── */}
      <section
        className="px-4 py-16 text-center sm:px-6"
        style={{ background: 'var(--accent-primary)' }}
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-white">
            Ready to upgrade your placement cell?
          </h2>
          <p className="mt-3 text-white/80">
            Set up your campus in under 5 minutes. Invite your first batch today.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/college/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ color: 'var(--accent-primary)' }}
            >
              Sign Up for Your College
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/campus"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        className="border-t px-4 py-8 text-center text-xs sm:px-6"
        style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
      >
        <p>
          © {new Date().getFullYear()} InterviewEra &nbsp;·&nbsp;
          <Link href="/privacy" className="hover:opacity-70">Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms" className="hover:opacity-70">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
