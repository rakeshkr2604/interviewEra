import type { Metadata } from 'next';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Linkedin,
  ListChecks,
  Sparkles,
  Target,
} from 'lucide-react';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';
import { BrandWebProfiles } from '@/components/seo/BrandWebProfiles';
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection';
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld';
import {
  FOUNDER_GITHUB_URL,
  FOUNDER_LINKEDIN_URL,
  generateMetadata,
  schemaIds,
  siteConfig,
  siteOrganizationStructured,
} from '@/lib/seo/metadata';
import type { SeoTextLink } from '@/lib/seo/internal-links';

const PAGE_PATH = '/interviewera';

const PAGE_DESCRIPTION =
  'What is InterviewEra? An AI mock interview platform for Indian campus hiring — resume-aware sessions, rubric scoring, and STAR coaching, founded by Rakesh Kumar.';

export const metadata: Metadata = {
  ...generateMetadata({
    title: 'What Is InterviewEra?',
    documentTitleAbsolute: 'InterviewEra — What It Is, Features & Founder',
    socialTitle: 'What Is InterviewEra? AI Mock Interview Platform',
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    keywords: [
      'InterviewEra',
      'Interview Era',
      'what is InterviewEra',
      'InterviewEra app',
      'InterviewEra mock interview',
      'AI mock interview platform India',
    ],
  }),
};

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Resume-aware mock interviews',
    body: 'InterviewEra reads your resume and asks about the projects, roles, and skills you actually listed — not a generic question bank.',
  },
  {
    icon: ListChecks,
    title: 'Rubric-based evaluation',
    body: 'Every answer is scored against a clear rubric, so you get structured, repeatable feedback instead of a single vague rating.',
  },
  {
    icon: BarChart3,
    title: 'Five-dimension scoring',
    body: 'Each response is rated across five dimensions with specific pointers, so you know exactly what to fix before the next round.',
  },
  {
    icon: Target,
    title: 'STAR-method coaching',
    body: 'Behavioural answers are coached toward the STAR structure that placement panels expect under pressure.',
  },
  {
    icon: Building2,
    title: 'Campus placement preparation',
    body: 'Built for Indian campus hiring and early-career roles — including batch training and analytics for placement cells.',
  },
  {
    icon: Sparkles,
    title: 'Free AI interview practice',
    body: 'Start practising with AI mock interviews for free, no card required, then track how your scores improve over time.',
  },
] as const;

const BRAND_LINKS: SeoTextLink[] = [
  { href: '/about', label: 'About InterviewEra' },
  { href: '/campus', label: 'InterviewEra for Campus Placements' },
  { href: '/tools/question-generator', label: 'InterviewEra Question Generator' },
  { href: '/tools/ats-checker', label: 'InterviewEra ATS Checker' },
  { href: '/interview-questions', label: 'InterviewEra Interview Questions' },
  { href: '/blog', label: 'InterviewEra Blog' },
  { href: '/pricing', label: 'InterviewEra Pricing' },
];

const FAQS = [
  {
    question: 'What is InterviewEra?',
    answer:
      `${siteConfig.entityDefinition} It runs resume-aware mock interviews, scores each answer against a rubric across five dimensions, and coaches behavioural answers using the STAR method.`,
  },
  {
    question: 'Is InterviewEra the same as an interviewer?',
    answer:
      'No. InterviewEra (also written "Interview Era") is the brand name of an AI interview-preparation platform — it is a product, not a job title. The name combines "Interview" and "Era".',
  },
  {
    question: 'Who founded InterviewEra?',
    answer:
      'InterviewEra was founded by Rakesh Kumar, who serves as Founder & CEO. The company is based in Ranchi, Jharkhand, India.',
  },
  {
    question: 'Is InterviewEra free to use?',
    answer:
      'Yes. You can start practising AI mock interviews on InterviewEra for free, with no credit card required. Paid plans and campus plans add more credits and analytics.',
  },
  {
    question: 'Where can I find InterviewEra online?',
    answer:
      'InterviewEra is available at interviewera.com and on LinkedIn at linkedin.com/company/interviewera.',
  },
] as const;

const cardShell = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const;

export default function InterviewEraBrandPage() {
  const breadcrumbLd = breadcrumbListJsonLd(
    [
      { name: 'Home', path: '/' },
      { name: 'InterviewEra', path: PAGE_PATH },
    ],
    siteConfig.url,
  );

  const faqLd = faqPageJsonLd([...FAQS]);

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'What Is InterviewEra?',
    description: PAGE_DESCRIPTION,
    url: `${siteConfig.url}${PAGE_PATH}`,
    inLanguage: 'en-IN',
    isPartOf: { '@id': `${siteConfig.url}#website` },
    about: { '@id': schemaIds.organization },
    mainEntity: { '@id': schemaIds.organization },
    primaryImageOfPage: { '@id': schemaIds.logo },
  } as const;

  return (
    <>
      <BlogMarketingShell>
        {/* ── HERO / DEFINITION ── */}
        <header className="mx-auto max-w-3xl text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            <Sparkles className="size-3.5" aria-hidden />
            Brand &amp; Platform Overview
          </div>

          <h1 className="mt-5 text-[2rem] font-bold leading-[1.1] tracking-tight text-balance sm:text-4xl md:text-5xl">
            What is InterviewEra?
          </h1>

          <p
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>InterviewEra</strong> — also written{' '}
            <em style={{ fontStyle: 'normal', color: 'var(--text-primary)' }}>Interview Era</em> — is an
            AI-powered mock interview platform for Indian campus hiring and early-career preparation. The name
            combines <strong style={{ color: 'var(--text-primary)' }}>Interview</strong> and{' '}
            <strong style={{ color: 'var(--text-primary)' }}>Era</strong>; it is a product brand, not the word
            &ldquo;interviewer&rdquo;.
          </p>
        </header>

        {/* ── WHAT IT IS ── */}
        <section className="mt-14 sm:mt-16" aria-labelledby="what-heading">
          <h2 id="what-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            InterviewEra in one line
          </h2>
          {/* Canonical brand definition — single source of truth (siteConfig.entityDefinition). */}
          <p className="mt-4 max-w-2xl text-base font-medium leading-[1.85]" style={{ color: 'var(--text-primary)' }}>
            {siteConfig.entityDefinition}
          </p>
          <p className="mt-4 max-w-2xl text-base leading-[1.85]" style={{ color: 'var(--text-secondary)' }}>
            In practice: you upload your resume, answer questions generated from what you actually wrote, and get
            rubric-scored feedback across five dimensions — so you walk into placements knowing how you will be
            read, not hoping the panel fills in the gaps.
          </p>
        </section>

        {/* ── WHY IT EXISTS ── */}
        <section className="mt-12 sm:mt-14" aria-labelledby="why-heading">
          <h2 id="why-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Why InterviewEra exists
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-[1.85]" style={{ color: 'var(--text-secondary)' }}>
            Most interview preparation stays unstructured: long AI chat threads, vague encouragement, and no
            score breakdown. Indian campus hiring moves fast, and panels still place every candidate in a band.
            InterviewEra exists to give early-career candidates the same structured signal panels use — resume-grounded
            questions, dimension-level scoring, and a practice loop you can repeat until the weak spots are obvious.
          </p>
        </section>

        {/* ── FEATURES ── */}
        <section className="mt-12 sm:mt-14" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            What you can do on InterviewEra
          </h2>
          <ul className="mt-6 grid list-none gap-5 p-0 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="p-0">
                <article
                  className="flex h-full flex-col rounded-2xl border-2 p-5 sm:p-6"
                  style={cardShell}
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-bold sm:text-lg">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                    {body}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </section>

        {/* ── FOUNDER ── */}
        <section className="mt-12 sm:mt-14" aria-labelledby="founder-heading">
          <h2 id="founder-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Who built InterviewEra
          </h2>
          <div
            className="mt-6 flex flex-col items-start gap-5 rounded-2xl border-2 p-6 sm:flex-row sm:items-center sm:gap-7"
            style={cardShell}
          >
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
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {siteOrganizationStructured.founder.name}
                <span className="ml-2 text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
                  {siteOrganizationStructured.founder.jobTitle}
                </span>
              </p>
              <p className="mt-2 max-w-xl text-sm leading-[1.8] sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                InterviewEra was founded by Rakesh Kumar to replace one-off mocks with a structured, repeatable
                practice system for Indian campus and early-career candidates.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <a
                  href={FOUNDER_LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-75"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Linkedin className="size-3.5" aria-hidden />
                  Rakesh Kumar on LinkedIn
                  <ExternalLink className="size-3 opacity-60" aria-hidden />
                </a>
                <a
                  href={FOUNDER_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-75"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Rakesh Kumar on GitHub
                  <ExternalLink className="size-3 opacity-60" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── OFFICIAL LINKS ── */}
        <BrandWebProfiles headingId="official-heading" />

        {/* ── FAQ ── */}
        <section className="mt-12 sm:mt-14" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Frequently asked questions about InterviewEra
          </h2>
          <dl className="mt-6 space-y-4">
            {FAQS.map(({ question, answer }) => (
              <div key={question} className="rounded-2xl border-2 p-5 sm:p-6" style={cardShell}>
                <dt className="flex items-start gap-2.5 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                  {question}
                </dt>
                <dd className="mt-2 pl-6.5 text-sm leading-[1.8] sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                  {answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── CTA ── */}
        <div className="mt-14 sm:mt-16">
          <FreeToolCtaBlock
            title="Try InterviewEra free"
            body="Upload your resume, run a scored mock interview, and see exactly what to improve before placement season."
            href="/signup"
            ctaLabel="Start free on InterviewEra"
          />
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      </BlogMarketingShell>

      <SeoCrossLinksSection heading="Explore InterviewEra" links={BRAND_LINKS} />
    </>
  );
}
