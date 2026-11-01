import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import {
  breadcrumbListJsonLd,
  faqPageJsonLd,
  howToJsonLd,
  webApplicationJsonLd,
} from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { schemaIds } from '@/lib/seo/metadata'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import {
  getCompanyBySlug,
  allToolVariantCompanyParams,
  companyQuestionsPath,
  qgDeepLinkPath,
} from '@/lib/seo/programmatic'
import {
  toolQGenCompanyMetadata,
  toolQGenCompanyBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import { getCompanyQuestionsFlat, buildFaqPairs } from '@/lib/seo/programmatic/questions'
import { LANDING_PAGE_CONTAINER, LANDING_SECTION } from '@/lib/landing/container'
import { buildToolQGenCompanyLinks } from '@/lib/seo/internal-linking'
import type { CompanySlug } from '@/lib/seo/programmatic'

export function generateStaticParams() {
  return allToolVariantCompanyParams()
}

/** Unknown slugs must 404 at the router — not soft-404 via streamed notFound() under (marketing)/loading.tsx. */
export const dynamicParams = false

type Props = { params: Promise<{ company: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company: companySlug } = await params
  const company = getCompanyBySlug(companySlug)
  if (!company) return {}
  return toolQGenCompanyMetadata(company)
}

const ORIGIN = getCanonicalSiteOrigin()

const WEBAPP_LD = webApplicationJsonLd({
  name: 'Free Interview Question Generator',
  description:
    'Generate AI-powered, company-specific interview questions in seconds. Free with a registered InterviewEra account.',
  url: canonicalUrl('/tools/question-generator'),
  providerId: schemaIds.organization,
})

export default async function QGenCompanyPage({ params }: Props) {
  const { company: companySlug } = await params
  const company = getCompanyBySlug(companySlug)
  if (!company) notFound()

  const allQuestions = getCompanyQuestionsFlat(company.slug as CompanySlug)
  const previewQuestions = allQuestions.slice(0, 5)
  const faqPairs = buildFaqPairs(previewQuestions)
  const linkSections = buildToolQGenCompanyLinks(company)

  const BREADCRUMB_LD = breadcrumbListJsonLd(toolQGenCompanyBreadcrumbs(company), ORIGIN)
  const FAQ_LD = faqPairs.length > 0 ? faqPageJsonLd(faqPairs) : null
  const HOWTO_LD = howToJsonLd(
    `How to generate ${company.label} interview questions`,
    `Use the free generator to practise for your ${company.label} interview across all ${company.typicalRounds} rounds.`,
    [
      {
        name: 'Select the company',
        text: `Choose ${company.label} in the question generator. The tool tailors questions to ${company.label}'s known hiring criteria and interview style.`,
      },
      {
        name: 'Pick your target role',
        text: `Specify the role you are applying for — Software Engineer, Data Analyst, Business Analyst, etc. — to get role-calibrated questions.`,
      },
      {
        name: 'Generate and practise',
        text: `Get 10 interview questions in under 10 seconds. Practise each answer aloud. For behavioral questions, use the STAR method.`,
      },
      {
        name: 'Simulate the full process',
        text: `${company.label}'s interview process is: ${company.interviewStyle}. Run multiple generator sessions to cover each round's question type.`,
      },
    ],
  )

  return (
    <>
      <JsonLdScript id="qgen-company-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="qgen-company-webapp-ld" data={WEBAPP_LD} />
      <JsonLdScript id="qgen-company-howto-ld" data={HOWTO_LD} />
      {FAQ_LD ? <JsonLdScript id="qgen-company-faq-ld" data={FAQ_LD} /> : null}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${LANDING_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href="/tools/question-generator" className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Interview Question Generator
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <span>{company.label}</span>
          </nav>

          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            Free tool · free account · {company.typicalRounds} interview rounds
          </p>
          <h1
            className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Free {company.label} Interview Question Generator
          </h1>
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            Generate AI-powered {company.label} interview questions for all {company.typicalRounds} rounds.
            Process: {company.interviewStyle}.
            {company.fresherHiring ? ' Optimised for campus placements and fresher hiring.' : ''}
          </p>

          {/* Company stats */}
          <dl
            className="mt-6 grid gap-4 rounded-xl border p-5 sm:grid-cols-3"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
            }}
          >
            {[
              { label: 'Interview rounds', value: String(company.typicalRounds) },
              { label: 'Avg. package', value: company.avgPackageRange },
              { label: 'Fresher hiring', value: company.fresherHiring ? 'Yes' : 'Experienced only' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {item.label}
                </dt>
                <dd className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={qgDeepLinkPath('company', { company: company.label })}
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Generate {company.label} questions free
            </Link>
            <Link
              href={companyQuestionsPath(company.slug as CompanySlug)}
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Browse {company.label} question bank
            </Link>
          </div>
        </div>
      </section>

      {/* ── Sample questions ─────────────────────────────────────────────── */}
      {previewQuestions.length > 0 ? (
        <section className={LANDING_SECTION}>
          <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
            <h2
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Sample {company.label} interview questions
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              From our curated bank of {allQuestions.length} {company.label}-specific questions. The generator produces fresh AI-tailored questions each run.
            </p>
            <ul className="mt-5 grid gap-3">
              {previewQuestions.map((q, i) => (
                <li
                  key={q.question}
                  className="flex gap-3 rounded-lg border p-4"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                  }}
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)', color: 'var(--accent-primary)' }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
                    {q.tip ? (
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        Tip: {q.tip}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Link
                href={companyQuestionsPath(company.slug as CompanySlug)}
                className="font-medium hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                See all {allQuestions.length} {company.label} questions →
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* ── Interview rounds guide ────────────────────────────────────────── */}
      <section className={LANDING_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {company.label} interview process
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Practise questions for each stage to maximise your preparation.
          </p>
          <ol className="mt-5 flex flex-wrap items-center gap-2" aria-label="Interview stages">
            {company.interviewStyle.split(/\s*→\s*/).map((step, i, arr) => (
              <li key={step} className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{step}</span>
                {i < arr.length - 1 ? (
                  <span aria-hidden className="hidden text-lg font-light sm:block" style={{ color: 'var(--text-muted)' }}>→</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className={`${LANDING_SECTION} border-y`}
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
            Simulate a full {company.label} mock interview
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Upload your resume and get scored on technical depth, communication, structure, confidence,
            and relevance — the same criteria {company.label} panels use.
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
              href={qgDeepLinkPath('company', { company: company.label })}
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate questions now
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
