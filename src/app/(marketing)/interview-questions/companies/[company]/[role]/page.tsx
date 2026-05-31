import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import {
  getCompanyBySlug,
  getRoleBySlug,
  highValueIntersectionParams,
  companyQuestionsPath,
  questionsHubPath,
} from '@/lib/seo/programmatic'
import {
  intersectionPageMetadata,
  intersectionBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import {
  getRoleQuestionsFlat,
  buildFaqPairs,
} from '@/lib/seo/programmatic/questions'
import { LANDING_PAGE_CONTAINER, CONTENT_SECTION } from '@/lib/landing/container'
import { buildIntersectionPageLinks } from '@/lib/seo/internal-linking'

export function generateStaticParams() {
  return highValueIntersectionParams()
}

type Props = { params: Promise<{ company: string; role: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company: companySl, role: roleSl } = await params
  const company = getCompanyBySlug(companySl)
  const role = getRoleBySlug(roleSl)
  if (!company || !role) return {}
  return intersectionPageMetadata(company, role)
}

const ORIGIN = getCanonicalSiteOrigin()

export default async function IntersectionQuestionsPage({ params }: Props) {
  const { company: companySl, role: roleSl } = await params
  const company = getCompanyBySlug(companySl)
  const role = getRoleBySlug(roleSl)
  if (!company || !role) notFound()

  // Use role questions as the base — intersection-specific questions are a Phase 2 addition
  const questions = getRoleQuestionsFlat(role.slug)
  const faqPairs = buildFaqPairs(questions)

  const BREADCRUMB_LD = breadcrumbListJsonLd(
    intersectionBreadcrumbs(company, role),
    ORIGIN,
  )
  const FAQ_LD = faqPairs.length > 0 ? faqPageJsonLd(faqPairs) : null

  // Engine-driven cross-links. These pages are held noindex,follow (soft
  // duplicate of the role bank), so dense follow links here funnel authority to
  // the indexable role + company parents and serve users who land via internal links.
  const linkSections = buildIntersectionPageLinks(company, role)

  return (
    <>
      <JsonLdScript id="intersection-breadcrumb-ld" data={BREADCRUMB_LD} />
      {FAQ_LD ? <JsonLdScript id="intersection-faq-ld" data={FAQ_LD} /> : null}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Interview Questions
            </Link>
            <span aria-hidden>›</span>
            <Link href={companyQuestionsPath(company.slug)} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              {company.label}
            </Link>
            <span aria-hidden>›</span>
            <span>{role.shortLabel}</span>
          </nav>

          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            {company.label} · {role.category}
          </p>
          <h1
            className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {company.label} {role.label} Interview Questions 2026
          </h1>
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            Preparation guide for {role.label} positions at {company.fullName}. Covers their{' '}
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {company.interviewStyle}
            </span>{' '}
            process with technical, behavioral, and HR questions.
          </p>

          {/* Combined info strip */}
          <dl
            className="mt-7 grid gap-4 rounded-xl border p-5 sm:grid-cols-3"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
            }}
          >
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Interview rounds
              </dt>
              <dd className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {company.typicalRounds}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Avg. package
              </dt>
              <dd className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {company.avgPackageRange}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Role type
              </dt>
              <dd className="mt-1 text-base font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                {role.category}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Questions ────────────────────────────────────────────────────── */}
      <section className={CONTENT_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <QuestionsList
            questions={questions}
            heading={`${company.label} ${role.label} Interview Questions`}
          />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-y`}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="max-w-xl text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Practice answering, not just reading
          </h2>
          <p
            className="mt-2 max-w-xl text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Take a full scored mock interview tailored to your resume. Get feedback on technical
            depth, clarity, structure, confidence, and relevance — free to start.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Start free mock interview
            </Link>
            <Link
              href="/tools/question-generator"
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Free question generator
            </Link>
          </div>
        </div>
      </section>

      {linkSections.map((section) => (
        <SeoCrossLinksSection
          key={section.heading}
          heading={section.heading}
          links={section.links}
        />
      ))}
    </>
  )
}
