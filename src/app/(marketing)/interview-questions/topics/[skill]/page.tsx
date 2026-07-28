import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { ReactHubArticle } from '@/components/programmatic/ReactHubArticle'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import {
  getSkillBySlug,
  allSkillParams,
  questionsHubPath,
  qgDeepLinkPath,
} from '@/lib/seo/programmatic'
import {
  skillPageMetadata,
  skillBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import {
  getSkillQuestionsFlat,
  getSkillQuestionSet,
  buildFaqPairs,
} from '@/lib/seo/programmatic/questions'
import { generateMetadata as baseGenerateMetadata } from '@/lib/seo/metadata'
import { schemaIds } from '@/lib/seo/metadata'
import {
  REACT_AUTHOR_NAME,
  REACT_CANONICAL_PATH,
  REACT_DESCRIPTION,
  REACT_FAQ_ITEMS,
  REACT_HERO_ALT,
  REACT_HERO_HEIGHT,
  REACT_HERO_PATH,
  REACT_HERO_WIDTH,
  REACT_ARCHITECTURE_ALT,
  REACT_ARCHITECTURE_HEIGHT,
  REACT_ARCHITECTURE_PATH,
  REACT_ARCHITECTURE_WIDTH,
  REACT_LAST_UPDATED,
  REACT_META_TITLE,
  REACT_PUBLISHED_DATE,
  REACT_REVIEWED_DATE,
  REACT_REVIEWER_NAME,
  REACT_ROADMAP_ALT,
  REACT_ROADMAP_HEIGHT,
  REACT_ROADMAP_PATH,
  REACT_ROADMAP_WIDTH,
  isReactHub,
} from '@/lib/seo/programmatic/react-hub'
import { LANDING_PAGE_CONTAINER, CONTENT_SECTION } from '@/lib/landing/container'
import { buildSkillPageLinks } from '@/lib/seo/internal-linking'
import type { SkillSlug } from '@/lib/seo/programmatic'
import '../../../blog/blog.css'

export function generateStaticParams() {
  return allSkillParams()
}

/** Unknown slugs must 404 at the router — not soft-404 via streamed notFound() under (marketing)/loading.tsx. */
export const dynamicParams = false

type Props = { params: Promise<{ skill: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { skill: skillSlug } = await params
  const skill = getSkillBySlug(skillSlug)
  if (!skill) return {}

  if (isReactHub(skill.slug)) {
    const ORIGIN = getCanonicalSiteOrigin()
    return baseGenerateMetadata({
      title: REACT_META_TITLE,
      description: REACT_DESCRIPTION,
      path: REACT_CANONICAL_PATH,
      ogImage: `${ORIGIN}${REACT_HERO_PATH}`,
      keywords: [
        'React interview questions',
        'React.js interview questions 2026',
        'React hooks interview questions',
        'React interview questions India',
        'React Context API interview',
        'React state management interview',
        'React performance interview questions',
        'React mock interview',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }

  return skillPageMetadata(skill)
}

const ORIGIN = getCanonicalSiteOrigin()

const CATEGORY_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  data: 'Data & ML',
  devops: 'DevOps',
  database: 'Database',
  'cs-fundamentals': 'CS Fundamentals',
  cloud: 'Cloud',
  mobile: 'Mobile',
}

export default async function SkillQuestionsPage({ params }: Props) {
  const { skill: skillSlug } = await params
  const skill = getSkillBySlug(skillSlug)
  if (!skill) notFound()

  const questions = getSkillQuestionsFlat(skill.slug as SkillSlug)
  const questionSet = getSkillQuestionSet(skill.slug as SkillSlug)
  const linkSections = buildSkillPageLinks(skill)

  if (isReactHub(skill.slug)) {
    const BREADCRUMB_LD = breadcrumbListJsonLd(skillBreadcrumbs(skill), ORIGIN)
    const FAQ_LD = faqPageJsonLd([...REACT_FAQ_ITEMS])
    const pageUrl = canonicalUrl(REACT_CANONICAL_PATH)

    const ITEM_LIST_LD =
      questions.length > 0 && pageUrl
        ? {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            name: `${skill.label} interview questions`,
            url: pageUrl,
            numberOfItems: questions.length,
            itemListElement: questions.map((q, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: q.question,
            })),
          }
        : null

    const REACT_PAGE_LD = pageUrl
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
              '@id': `${ORIGIN}#react-author`,
              name: REACT_AUTHOR_NAME,
              worksFor: { '@id': schemaIds.organization },
            },
            {
              '@type': 'Person',
              '@id': `${ORIGIN}#react-reviewer`,
              name: REACT_REVIEWER_NAME,
              worksFor: { '@id': schemaIds.organization },
            },
            {
              '@type': 'ImageObject',
              '@id': `${ORIGIN}${REACT_HERO_PATH}#image`,
              url: `${ORIGIN}${REACT_HERO_PATH}`,
              contentUrl: `${ORIGIN}${REACT_HERO_PATH}`,
              caption: REACT_HERO_ALT,
              width: REACT_HERO_WIDTH,
              height: REACT_HERO_HEIGHT,
            },
            {
              '@type': 'ImageObject',
              '@id': `${ORIGIN}${REACT_ROADMAP_PATH}#image`,
              url: `${ORIGIN}${REACT_ROADMAP_PATH}`,
              contentUrl: `${ORIGIN}${REACT_ROADMAP_PATH}`,
              caption: REACT_ROADMAP_ALT,
              width: REACT_ROADMAP_WIDTH,
              height: REACT_ROADMAP_HEIGHT,
            },
            {
              '@type': 'ImageObject',
              '@id': `${ORIGIN}${REACT_ARCHITECTURE_PATH}#image`,
              url: `${ORIGIN}${REACT_ARCHITECTURE_PATH}`,
              contentUrl: `${ORIGIN}${REACT_ARCHITECTURE_PATH}`,
              caption: REACT_ARCHITECTURE_ALT,
              width: REACT_ARCHITECTURE_WIDTH,
              height: REACT_ARCHITECTURE_HEIGHT,
            },
            {
              '@type': 'WebPage',
              '@id': pageUrl,
              url: pageUrl,
              name: REACT_META_TITLE,
              isPartOf: { '@id': `${ORIGIN}#website` },
              primaryImageOfPage: { '@id': `${ORIGIN}${REACT_HERO_PATH}#image` },
              mainEntity: { '@id': `${pageUrl}#article` },
              inLanguage: 'en-IN',
            },
            {
              '@type': 'Article',
              '@id': `${pageUrl}#article`,
              headline: REACT_META_TITLE,
              description: REACT_DESCRIPTION,
              mainEntityOfPage: { '@id': pageUrl },
              url: pageUrl,
              datePublished: REACT_PUBLISHED_DATE,
              dateModified: REACT_LAST_UPDATED,
              dateReviewed: REACT_REVIEWED_DATE,
              author: { '@id': `${ORIGIN}#react-author` },
              reviewedBy: { '@id': `${ORIGIN}#react-reviewer` },
              publisher: { '@id': schemaIds.organization },
              image: [
                { '@id': `${ORIGIN}${REACT_HERO_PATH}#image` },
                { '@id': `${ORIGIN}${REACT_ROADMAP_PATH}#image` },
                { '@id': `${ORIGIN}${REACT_ARCHITECTURE_PATH}#image` },
              ],
              speakable: {
                '@type': 'SpeakableSpecification',
                cssSelector: ['h1', '#react-roadmap', '#react-topic-importance', '#react-questions'],
              },
            },
          ],
        }
      : null

    return (
      <>
        <JsonLdScript id="react-breadcrumb-ld" data={BREADCRUMB_LD} />
        <JsonLdScript id="react-faq-ld" data={FAQ_LD} />
        {ITEM_LIST_LD ? <JsonLdScript id="react-question-itemlist-ld" data={ITEM_LIST_LD} /> : null}
        <JsonLdScript id="react-page-ld" data={REACT_PAGE_LD} />

        <ReactHubArticle skill={skill} questions={questions} />

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

  const faqPairs = buildFaqPairs(questions)
  const BREADCRUMB_LD = breadcrumbListJsonLd(skillBreadcrumbs(skill), ORIGIN)
  const FAQ_LD = faqPairs.length > 0 ? faqPageJsonLd(faqPairs) : null

  return (
    <>
      <JsonLdScript id="skill-breadcrumb-ld" data={BREADCRUMB_LD} />
      {FAQ_LD ? <JsonLdScript id="skill-faq-ld" data={FAQ_LD} /> : null}

      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <nav className="mb-4 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Interview Questions
            </Link>
            <span aria-hidden>›</span>
            <Link href={`${questionsHubPath()}/topics`} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Topics
            </Link>
            <span aria-hidden>›</span>
            <span>{skill.label}</span>
          </nav>

          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            {CATEGORY_LABELS[skill.category] ?? skill.category}
            {skill.fresherRelevant ? ' · Fresher-relevant' : ''}
          </p>
          <h1
            className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {skill.label} Interview Questions 2026
          </h1>
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {skill.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              {CATEGORY_LABELS[skill.category] ?? skill.category}
            </span>
            {skill.fresherRelevant ? (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: 'color-mix(in srgb, #22c55e 14%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                Fresher-relevant
              </span>
            ) : null}
          </div>

          {questionSet?.commonlyAskedAt ? (
            <p className="mt-5 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Commonly asked at:{' '}
              </span>
              {questionSet.commonlyAskedAt}
            </p>
          ) : null}
          {questionSet?.legalDisclaimer ? (
            <p className="mt-2 max-w-3xl text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {questionSet.legalDisclaimer}
            </p>
          ) : null}
        </div>
      </section>

      <section className={CONTENT_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <QuestionsList
            questions={questions}
            heading={`${skill.label} Interview Questions`}
            variant="skill-rich"
          />
        </div>
      </section>

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
            Practice {skill.shortLabel} questions with your own resume
          </h2>
          <p
            className="mt-2 max-w-xl text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            InterviewEra generates role-specific questions using your actual projects and skills.
            Get scored feedback on technical depth, clarity, and structure — free to start.
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
              href={qgDeepLinkPath('topic', { topic: skill.label })}
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
