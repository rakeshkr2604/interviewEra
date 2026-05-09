import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, ExternalLink, FileSearch, Sparkles, Target, TrendingUp } from 'lucide-react';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { FreeToolCtaBlock, FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { generateMetadata, schemaIds, siteConfig, siteOrganizationStructured } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

const ABOUT_PAGE_DESCRIPTION =
  'InterviewEra is an AI-powered mock interview platform for Indian campus and early-career hiring: resume-aware sessions, rubric-scored feedback, and structured practice you can repeat.';

export const metadata: Metadata = generateMetadata({
  title: 'About',
  description: ABOUT_PAGE_DESCRIPTION,
  path: '/about',
});

const PILLARS = [
  {
    icon: FileSearch,
    title: 'Interviews built from your resume',
    body: 'Every question references your actual projects, role, and experience level — not a generic bank that gives the same prompts to everyone.',
  },
  {
    icon: TrendingUp,
    title: 'Scores you can act on',
    body: 'Each answer is rated across five dimensions with specific pointers. You know exactly what to fix before the next session.',
  },
  {
    icon: CalendarCheck,
    title: 'Practice designed to compound',
    body: 'Track score trends across sessions. See what has improved and what still needs work — not one number with no context.',
  },
] as const;

const BULLETS = [
  { icon: Target,        text: 'Interviews tailored to your actual resume, not a generic bank' },
  { icon: Sparkles,      text: 'Rubric-based scores across five dimensions per answer' },
  { icon: CalendarCheck, text: 'Track progress across sessions, not one-off guesses' },
] as const;

const miniHeaderStrip = {
  borderColor: 'var(--card-border)',
  background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent)',
} as const;

const miniCardShell = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
  boxShadow:
    'var(--card-shadow), 0 0 48px color-mix(in srgb, var(--accent-primary) 8%, transparent), 0 0 0 1px color-mix(in srgb, white 45%, transparent) inset',
} as const;

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function AboutPage() {
  const aboutPageLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${siteConfig.name}`,
    description: ABOUT_PAGE_DESCRIPTION,
    url: `${siteConfig.url}/about`,
    inLanguage: 'en-IN',
    isPartOf: { '@id': `${siteConfig.url}#website` },
    mainEntity: { '@id': schemaIds.organization },
    about: { '@id': schemaIds.organization },
  } as const;

  return (
    <BlogMarketingShell>

      {/* ── HERO ── */}
      <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-16">
        <div className="mx-auto max-w-xl space-y-7 text-center lg:col-span-5 lg:mx-0 lg:max-w-none lg:pt-2 lg:text-left">

          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide lg:mx-0"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            <Sparkles className="size-3.5" aria-hidden />
            AI Interview Platform
          </div>

          {/* Headline + sub */}
          <div className="space-y-4">
            <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl md:text-5xl md:leading-[1.05]">
              Practice interviews with AI —{' '}
              <span style={{ color: 'var(--accent-primary)' }}>not guesswork.</span>
            </h1>
          <p className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            Every session is grounded in your resume, scored against a clear rubric,
            and built to compound between attempts — for Indian campus and early-career hiring, not generic chat practice.
          </p>
          </div>

          {/* Bullets */}
          <ul className="mx-auto max-w-md space-y-3 text-left sm:max-w-lg lg:mx-0 lg:max-w-none">
            {BULLETS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                <span
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>

          {/* Trust line — honest, no fake metrics */}
          <p
            className="text-xs font-medium tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Built for placement season · Resume-aware · Rubric-scored · Honest feedback you can act on
          </p>

          {/* Secondary nav */}
          <p className="text-sm lg:text-left" style={{ color: 'var(--text-muted)' }}>
            More to read:{' '}
            <Link href="/blog" className="ie-blog-inline-link font-medium">
              Blog
            </Link>
            {' · '}
            <Link href="/tools/ats-checker" className="ie-blog-inline-link font-medium">
              Free tools
            </Link>
          </p>
        </div>

        {/* Mission card */}
        <div className="mx-auto w-full max-w-xl lg:col-span-7 lg:mx-0 lg:max-w-none lg:min-w-0">
          <FreeToolFormCard
            headerEyebrow="Mission"
            headerTitle="Why we built InterviewEra"
            headerSubtitle="Replace one-off mocks with a structured, repeatable practice system."
          >
            <div className="space-y-5 p-5 sm:p-7 lg:p-8">
              <p className="text-sm leading-[1.85] sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Most prep stays unstructured: long ChatGPT threads, vague encouragement, no score breakdown.
                Panels still have to place you in a band — and generic practice does not tell you which band you are in.
                InterviewEra fixes that: upload your resume, run scored mocks that reference your real projects,
                and exit each session knowing{' '}
                <strong style={{ color: 'var(--text-primary)' }}>exactly what to fix next.</strong>
              </p>
              <p className="text-sm leading-[1.85] sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Campus hiring in India moves fast; the lever is not more drills, it is{' '}
                <strong style={{ color: 'var(--text-primary)' }}>repeatable, measurable practice</strong>{' '}
                — the same structured signal panels use when they score you, without the guesswork in between.
              </p>
              <div
                className="flex items-center gap-3 rounded-xl border p-4"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-primary) 18%, transparent)',
                  background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
                }}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 18%, transparent)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  RK
                </span>
                <p className="text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  &ldquo;Structured, repeatable practice is what separates prepared candidates
                  from hopeful ones.&rdquo;
                  <span className="ml-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    — {siteOrganizationStructured.founder.name}, {siteOrganizationStructured.founder.jobTitle}
                  </span>
                </p>
              </div>
            </div>
          </FreeToolFormCard>
        </div>
      </div>

      {/* ── FEATURE CARDS ── */}
      <section className="mt-14 sm:mt-16 lg:mt-20" aria-labelledby="about-pillars-heading">
        <h2 id="about-pillars-heading" className="sr-only">What you get</h2>
        <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="p-0">
              <article
                className={cn(
                  'group flex h-full flex-col overflow-hidden rounded-[22px] border-2 lg:rounded-3xl',
                  'transition-all duration-300',
                  'hover:-translate-y-1.5 hover:border-(--accent-primary)',
                )}
                style={{
                  ...miniCardShell,
                  transition: 'transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease',
                }}
              >
                <div className="border-b px-5 py-4 sm:px-6" style={miniHeaderStrip}>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-10 items-center justify-center rounded-xl transition-colors duration-300 group-hover:bg-[var(--accent-primary)]"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Icon
                        className="size-5 transition-colors duration-300 group-hover:text-white"
                        aria-hidden
                      />
                    </span>
                    <h3 className="text-base font-bold leading-snug sm:text-lg">{title}</h3>
                  </div>
                </div>
                <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                  <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    {body}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* ── FOUNDER ── */}
      <section className="mt-14 sm:mt-16 lg:mt-20" aria-label="Founder">
        <div
          className="flex flex-col items-start gap-5 rounded-[22px] border-2 p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-7 lg:rounded-3xl"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
          }}
        >
          {/* Avatar */}
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold sm:size-16"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
              color: 'var(--accent-primary)',
              border: '2px solid color-mix(in srgb, var(--accent-primary) 22%, transparent)',
            }}
            aria-hidden="true"
          >
            RK
          </div>

          {/* Bio */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {siteOrganizationStructured.founder.name}
              </p>
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-balance"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                  color: 'var(--accent-primary)',
                }}
              >
                {siteOrganizationStructured.founder.jobTitle}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-[1.8] sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              InterviewEra exists because placement panels reward structured answers under pressure — not longer AI chats with
              no rubric. We focus on resume-grounded questions, dimension-level scoring, and a practice loop you can repeat until
              the weak spots are obvious.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-[1.8] sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              If you are preparing for Indian campus or your first full-time role, the goal is the same: walk in knowing how you
              will be read, not hoping the panel fills in the gaps.
            </p>

            {/* Links */}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/rakesh2604"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-75 sm:text-sm"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Rakesh Kumar on GitHub"
              >
                <GitHubIcon className="size-3.5" />
                github.com/rakesh2604
                <ExternalLink className="size-3 opacity-60" aria-hidden />
              </a>
              <span aria-hidden="true" style={{ color: 'var(--card-border)' }}>·</span>
              <a
                href={siteOrganizationStructured.founder.sameAs[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-75 sm:text-sm"
                style={{ color: 'var(--text-muted)' }}
                aria-label={`${siteOrganizationStructured.founder.name} on LinkedIn`}
              >
                <LinkedInIcon className="size-3.5" />
                linkedin.com/in/rakeshkumar2604
                <ExternalLink className="size-3 opacity-60" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="mt-14 sm:mt-16 lg:mt-20">
        <FreeToolCtaBlock
          title="Practice interviews on your actual resume"
          body="Upload your resume, run a scored mock session, and get specific feedback on what to improve — not a generic assessment."
          href="/signup"
          ctaLabel="Sign up free"
        />
      </div>

      {/* Page-level JSON-LD — references org + website nodes from root layout graph */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageLd) }}
      />
    </BlogMarketingShell>
  );
}
