import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { WiproHubArticle } from '@/components/programmatic/WiproHubArticle'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import { RelatedGuidesSection } from '@/components/content/RelatedGuidesSection'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import { generateMetadata as baseGenerateMetadata } from '@/lib/seo/metadata'
import { schemaIds } from '@/lib/seo/metadata'
import {
  getCompanyBySlug,
  allCompanyParams,
  questionsHubPath,
  qgDeepLinkPath,
} from '@/lib/seo/programmatic'
import {
  companyPageMetadata,
  companyBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import {
  getCompanyQuestionsFlat,
  buildFaqPairs,
} from '@/lib/seo/programmatic/questions'
import {
  WIPRO_AUTHOR_NAME,
  WIPRO_CANONICAL_PATH,
  WIPRO_DESCRIPTION,
  WIPRO_FAQ_ITEMS,
  WIPRO_HERO_ALT,
  WIPRO_HERO_HEIGHT,
  WIPRO_HERO_PATH,
  WIPRO_HERO_WIDTH,
  WIPRO_HUB_QUESTIONS,
  WIPRO_LAST_UPDATED,
  WIPRO_META_TITLE,
  WIPRO_PROCESS_ALT,
  WIPRO_PROCESS_HEIGHT,
  WIPRO_PROCESS_PATH,
  WIPRO_PROCESS_WIDTH,
  WIPRO_PUBLISHED_DATE,
  WIPRO_REVIEWED_DATE,
  WIPRO_REVIEWER_NAME,
  isWiproCompanyHub,
} from '@/lib/seo/programmatic/wipro-hub'
import { LANDING_PAGE_CONTAINER, CONTENT_SECTION } from '@/lib/landing/container'
import { buildCompanyPageLinks } from '@/lib/seo/internal-linking'
import type { CompanySlug, CompanyTier } from '@/lib/seo/programmatic'
import '../../../blog/blog.css'

export function generateStaticParams() {
  return allCompanyParams()
}

/** Unknown slugs must 404 at the router — not soft-404 via streamed notFound() under (marketing)/loading.tsx. */
export const dynamicParams = false

type Props = { params: Promise<{ company: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company: companySlug } = await params
  const company = getCompanyBySlug(companySlug)
  if (!company) return {}

  if (isWiproCompanyHub(company.slug)) {
    return baseGenerateMetadata({
      title: WIPRO_META_TITLE,
      description: WIPRO_DESCRIPTION,
      path: WIPRO_CANONICAL_PATH,
      ogImage: `${ORIGIN}${WIPRO_HERO_PATH}`,
      keywords: [
        'Wipro hiring 2026',
        'Wipro recruitment',
        'Wipro NLTH',
        'Wipro WILP',
        'Wipro Turbo',
        'Wipro interview questions',
        'Wipro off campus',
        'Wipro salary fresher',
        'Wipro eligibility',
        'Wipro careers India',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }

  return companyPageMetadata(company)
}

const ORIGIN = getCanonicalSiteOrigin()

export default async function CompanyQuestionsPage({ params }: Props) {
  const { company: companySlug } = await params
  const company = getCompanyBySlug(companySlug)
  if (!company) notFound()

  // Hub consolidation — permanent so crawlers transfer equity to the editorial hubs.
  if (company.slug === 'tcs') {
    permanentRedirect('/interview-questions/tcs')
  }

  if (company.slug === 'solera') {
    permanentRedirect('/interview-questions/solera')
  }

  if (isWiproCompanyHub(company.slug)) {
    const hubQuestions = WIPRO_HUB_QUESTIONS
    const linkSections = buildCompanyPageLinks(company)

    const BREADCRUMB_LD = breadcrumbListJsonLd(
      [
        { name: 'Interview Questions', path: questionsHubPath() },
        { name: company.label, path: WIPRO_CANONICAL_PATH },
      ],
      ORIGIN,
    )

    const FAQ_LD = faqPageJsonLd([...WIPRO_FAQ_ITEMS])
    const pageUrl = canonicalUrl(WIPRO_CANONICAL_PATH)

    const ITEM_LIST_LD = pageUrl
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListOrder: 'https://schema.org/ItemListOrderAscending',
          name: `${company.label} interview questions`,
          url: pageUrl,
          numberOfItems: hubQuestions.length,
          itemListElement: hubQuestions.map((q, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: q.question,
          })),
        }
      : null

    const WIPRO_PAGE_LD = pageUrl
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              '@id': `${ORIGIN}#website`,
              url: ORIGIN,
              name: 'InterviewEra',
              publisher: { '@id': schemaIds.organization },
              inLanguage: 'en-IN',
            },
            {
              '@type': 'Organization',
              '@id': schemaIds.organization,
              name: 'InterviewEra',
              url: ORIGIN,
            },
            {
              '@type': 'Person',
              '@id': `${ORIGIN}#wipro-author`,
              name: WIPRO_AUTHOR_NAME,
              worksFor: { '@id': schemaIds.organization },
            },
            {
              '@type': 'Person',
              '@id': `${ORIGIN}#wipro-reviewer`,
              name: WIPRO_REVIEWER_NAME,
              worksFor: { '@id': schemaIds.organization },
            },
            {
              '@type': 'ImageObject',
              '@id': `${ORIGIN}${WIPRO_HERO_PATH}#image`,
              url: `${ORIGIN}${WIPRO_HERO_PATH}`,
              contentUrl: `${ORIGIN}${WIPRO_HERO_PATH}`,
              caption: WIPRO_HERO_ALT,
              width: WIPRO_HERO_WIDTH,
              height: WIPRO_HERO_HEIGHT,
            },
            {
              '@type': 'ImageObject',
              '@id': `${ORIGIN}${WIPRO_PROCESS_PATH}#image`,
              url: `${ORIGIN}${WIPRO_PROCESS_PATH}`,
              contentUrl: `${ORIGIN}${WIPRO_PROCESS_PATH}`,
              caption: WIPRO_PROCESS_ALT,
              width: WIPRO_PROCESS_WIDTH,
              height: WIPRO_PROCESS_HEIGHT,
            },
            {
              '@type': 'WebPage',
              '@id': pageUrl,
              url: pageUrl,
              name: WIPRO_META_TITLE,
              isPartOf: { '@id': `${ORIGIN}#website` },
              primaryImageOfPage: { '@id': `${ORIGIN}${WIPRO_HERO_PATH}#image` },
              mainEntity: { '@id': `${pageUrl}#article` },
              inLanguage: 'en-IN',
            },
            {
              '@type': 'CollectionPage',
              '@id': `${pageUrl}#collection`,
              name: `${company.label} Role Interview Guides`,
              about: [
                { '@type': 'WebPage', url: `${ORIGIN}/interview-questions/companies/wipro/software-engineer` },
                { '@type': 'WebPage', url: `${ORIGIN}/interview-questions/companies/wipro/java-developer` },
                { '@type': 'WebPage', url: `${ORIGIN}/interview-questions/companies/wipro/data-analyst` },
                { '@type': 'WebPage', url: `${ORIGIN}/interview-questions/companies/wipro/qa-engineer` },
              ],
            },
            {
              '@type': 'Article',
              '@id': `${pageUrl}#article`,
              headline: WIPRO_META_TITLE,
              description: WIPRO_DESCRIPTION,
              mainEntityOfPage: { '@id': pageUrl },
              url: pageUrl,
              datePublished: WIPRO_PUBLISHED_DATE,
              dateModified: WIPRO_LAST_UPDATED,
              dateReviewed: WIPRO_REVIEWED_DATE,
              author: { '@id': `${ORIGIN}#wipro-author` },
              reviewedBy: { '@id': `${ORIGIN}#wipro-reviewer` },
              publisher: { '@id': schemaIds.organization },
              image: [
                { '@id': `${ORIGIN}${WIPRO_HERO_PATH}#image` },
                { '@id': `${ORIGIN}${WIPRO_PROCESS_PATH}#image` },
              ],
              speakable: {
                '@type': 'SpeakableSpecification',
                cssSelector: [
                  'h1',
                  '#wipro-hub-overview',
                  '#wipro-hub-recruitment-calendar',
                  '#wipro-hub-salary',
                  '#wipro-hub-questions',
                ],
              },
            },
          ],
        }
      : null

    return (
      <>
        <JsonLdScript id="wipro-breadcrumb-ld" data={BREADCRUMB_LD} />
        <JsonLdScript id="wipro-faq-ld" data={FAQ_LD} />
        <JsonLdScript id="wipro-question-itemlist-ld" data={ITEM_LIST_LD} />
        <JsonLdScript id="wipro-page-ld" data={WIPRO_PAGE_LD} />

        <WiproHubArticle company={company} questions={hubQuestions} />

        <RelatedGuidesSection path={WIPRO_CANONICAL_PATH} />
        {linkSections.map((section) => (
          <SeoCrossLinksSection key={section.heading} heading={section.heading} links={section.links} />
        ))}
      </>
    )
  }

  const questions = getCompanyQuestionsFlat(company.slug as CompanySlug)
  const faqPairs = buildFaqPairs(questions)

  const interviewSteps = company.interviewStyle.split(/\s*→\s*/)
  const prepTips = buildPrepTips(company.tier, company.fresherHiring)
  const linkSections = buildCompanyPageLinks(company)

  const BREADCRUMB_LD = breadcrumbListJsonLd(companyBreadcrumbs(company), ORIGIN)
  const FAQ_LD = faqPairs.length > 0 ? faqPageJsonLd(faqPairs) : null

  return (
    <>
      <JsonLdScript id="company-breadcrumb-ld" data={BREADCRUMB_LD} />
      {FAQ_LD ? <JsonLdScript id="company-faq-ld" data={FAQ_LD} /> : null}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Interview Questions
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <span>{company.label}</span>
          </nav>

          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            {company.tier === 'service' ? 'IT Services' :
             company.tier === 'mnc' ? 'Global MNC' :
             company.tier === 'startup' ? 'Startup' : 'Product Company'} · {company.headquartersCity}
          </p>
          <h1
            className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {company.label} Interview Questions 2026
          </h1>
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {company.description}
          </p>

          <dl
            className="mt-7 grid gap-4 rounded-xl border p-5 sm:grid-cols-2 md:grid-cols-4"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
            }}
          >
            {[
              { label: 'Interview rounds', value: String(company.typicalRounds) },
              { label: 'Avg. package', value: company.avgPackageRange },
              { label: 'Fresher hiring', value: company.fresherHiring ? 'Yes' : 'Experienced only' },
              { label: 'HQ', value: company.headquartersCity },
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

          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Process: </span>
            {company.interviewStyle}
          </p>
        </div>
      </section>

      {/* ── Questions ────────────────────────────────────────────────────── */}
      <section className={CONTENT_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <QuestionsList
            questions={questions}
            heading={`${company.label} Interview Questions`}
          />
        </div>
      </section>

      {/* ── How to prepare ───────────────────────────────────────────────── */}
      <section className={CONTENT_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            How to prepare for a {company.label} interview
          </h2>
          <p
            className="mt-2 max-w-2xl text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {company.fullName !== company.label ? company.fullName : company.label} interviews follow a{' '}
            {company.typicalRounds}-round process. Here is what to expect and how to prepare for each stage.
          </p>

          <ol className="mt-6 flex flex-wrap items-center gap-2" aria-label="Interview stages">
            {interviewSteps.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {step}
                </span>
                {i < interviewSteps.length - 1 ? (
                  <span
                    aria-hidden
                    className="hidden text-lg font-light sm:block"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {prepTips.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 rounded-lg border p-4 text-sm leading-relaxed"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span
                  className="mt-0.5 shrink-0 text-xs font-bold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  ✓
                </span>
                {tip}
              </li>
            ))}
          </ul>
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
            Practice a full {company.label} mock interview
          </h2>
          <p
            className="mt-2 max-w-xl text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Upload your resume and get questions scored across technical depth, communication,
            structure, confidence, and relevance — the same criteria {company.label} panels use.
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
              Free question generator
            </Link>
          </div>
        </div>
      </section>

      {/* ── Engine-driven cross-link sections ────────────────────────────── */}
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

// ─── Tier-specific preparation tips ──────────────────────────────────────────

function buildPrepTips(tier: CompanyTier, fresherHiring: boolean): string[] {
  const fresherTip = fresherHiring
    ? 'Prepare your college projects: be ready to walk through architecture, tech stack choices, and challenges you faced.'
    : 'Bring documented examples of production impact — metrics, scale, and business outcomes matter here.'

  const tierTips: Record<CompanyTier, string[]> = {
    service: [
      'Revise core CS fundamentals: OOP, DBMS (SQL queries + normalisation), OS (processes, threads, deadlocks), and networking (OSI model, TCP/IP).',
      'Practise aptitude and reasoning: most service companies use an online screening test before any technical round.',
      'Write clean, correct code for standard problems: reverse a linked list, find duplicates, implement sorting algorithms from scratch.',
      'Prepare a strong "Tell me about yourself" answer that connects your academic background to the role in 60–90 seconds.',
      fresherTip,
      'Research the company\'s specific test format (NQT for TCS, InfyTQ for Infosys, NLTH for Wipro) and practice past papers.',
    ],
    mnc: [
      'LeetCode is mandatory: solve 150–200 Medium and Hard problems. Focus on trees, graphs, dynamic programming, and sliding window patterns.',
      'Study system design deeply: read "Designing Data-Intensive Applications" (Kleppmann) and review common designs (URL shortener, rate limiter, feed system).',
      'Prepare 5–6 detailed STAR stories covering: impact you drove, a failure you owned, a technical disagreement you navigated, and a time you led without authority.',
      'Practise thinking aloud: interviewers evaluate reasoning, not just answers. Verbalise every assumption and trade-off.',
      fresherTip,
      'Mock interviews matter: use Pramp or peer practice to simulate 45-minute coding rounds with a timer running.',
    ],
    product: [
      'Strengthen your DSA fundamentals: aim for clean solutions to LeetCode Medium problems within 25 minutes.',
      'Learn system design basics: caching strategies, database indexing, horizontal vs vertical scaling, and message queues.',
      'Understand the company\'s product and engineering blog: many product companies ask domain-specific questions tied to their actual tech stack.',
      'Prepare for culture-fit questions: product companies value ownership, speed, and first-principles thinking — have examples ready.',
      fresherTip,
      'Review backend fundamentals: REST APIs, database design, and common architectural patterns (microservices, event-driven).',
    ],
    startup: [
      'Demonstrate ownership and initiative: startups ask "tell me about a side project or problem you solved without being asked."',
      'Know the company\'s domain: if applying to a fintech startup, understand payments infrastructure, compliance basics (RBI, SEBI), and relevant technology choices.',
      'Be prepared for open-ended design questions: "how would you build X from scratch with a team of two engineers in three months?"',
      'Show you can move fast without breaking things: discuss how you balance speed and correctness in software decisions.',
      fresherTip,
      'Research the company\'s tech stack on their engineering blog or GitHub — mentioning specific tools they use shows genuine interest.',
    ],
  }

  return tierTips[tier]
}
