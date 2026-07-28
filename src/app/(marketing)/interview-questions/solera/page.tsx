import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { SoleraHubArticle } from '@/components/programmatic/SoleraHubArticle'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import { RelatedGuidesSection } from '@/components/content/RelatedGuidesSection'
import { generateMetadata as baseGenerateMetadata } from '@/lib/seo/metadata'
import { schemaIds } from '@/lib/seo/metadata'
import { getCompanyBySlug, questionsHubPath } from '@/lib/seo/programmatic'
import { buildCompanyPageLinks } from '@/lib/seo/internal-linking'
import {
  SOLERA_AUTHOR_NAME,
  SOLERA_CANONICAL_PATH,
  SOLERA_DESCRIPTION,
  SOLERA_FAQ_ITEMS,
  SOLERA_HERO_ALT,
  SOLERA_HERO_HEIGHT,
  SOLERA_HERO_PATH,
  SOLERA_HERO_WIDTH,
  SOLERA_HUB_QUESTIONS,
  SOLERA_LAST_UPDATED,
  SOLERA_META_TITLE,
  SOLERA_PROCESS_ALT,
  SOLERA_PROCESS_HEIGHT,
  SOLERA_PROCESS_PATH,
  SOLERA_PROCESS_WIDTH,
  SOLERA_PUBLISHED_DATE,
  SOLERA_REVIEWED_DATE,
  SOLERA_REVIEWER_NAME,
} from '@/lib/seo/programmatic/solera-hub'
import '../../blog/blog.css'

const ORIGIN = getCanonicalSiteOrigin()

export async function generateMetadata(): Promise<Metadata> {
  return baseGenerateMetadata({
    title: SOLERA_META_TITLE,
    description: SOLERA_DESCRIPTION,
    path: SOLERA_CANONICAL_PATH,
    ogImage: `${ORIGIN}${SOLERA_HERO_PATH}`,
    keywords: [
      'Solera interview questions',
      'Solera interview questions 2026',
      'Solera hiring 2026',
      'Solera recruitment',
      'Solera careers India',
      'Solera interview process',
      'Solera cognitive assessment',
      'Solera off campus drive',
      'Solera freshers hiring',
      'Solera software engineer interview',
      'Solera salary',
      'Solera online assessment',
      'Solera technical interview',
      'Solera Bengaluru jobs',
      'Solera Hyderabad hiring',
      'Solera Associate Software Engineer',
      'Solera coding questions',
      'Solera automotive SaaS',
      'Solera mock interview',
    ],
    openGraphType: 'article',
    noIndex: false,
  })
}

export default function SoleraInterviewHubPage() {
  const company = getCompanyBySlug('solera')
  if (!company) notFound()

  const hubQuestions = SOLERA_HUB_QUESTIONS
  const linkSections = buildCompanyPageLinks(company)

  const BREADCRUMB_LD = breadcrumbListJsonLd(
    [
      { name: 'Interview Questions', path: questionsHubPath() },
      { name: company.label, path: SOLERA_CANONICAL_PATH },
    ],
    ORIGIN,
  )

  const FAQ_LD = faqPageJsonLd([...SOLERA_FAQ_ITEMS])

  const pageUrl = canonicalUrl(SOLERA_CANONICAL_PATH)

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

  const SOLERA_PAGE_LD = pageUrl
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
            '@id': `${ORIGIN}#solera-author`,
            name: SOLERA_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#solera-reviewer`,
            name: SOLERA_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${SOLERA_HERO_PATH}#image`,
            url: `${ORIGIN}${SOLERA_HERO_PATH}`,
            contentUrl: `${ORIGIN}${SOLERA_HERO_PATH}`,
            caption: SOLERA_HERO_ALT,
            width: SOLERA_HERO_WIDTH,
            height: SOLERA_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${SOLERA_PROCESS_PATH}#image`,
            url: `${ORIGIN}${SOLERA_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${SOLERA_PROCESS_PATH}`,
            caption: SOLERA_PROCESS_ALT,
            width: SOLERA_PROCESS_WIDTH,
            height: SOLERA_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': pageUrl,
            url: pageUrl,
            name: SOLERA_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${SOLERA_HERO_PATH}#image` },
            mainEntity: { '@id': `${pageUrl}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'CollectionPage',
            '@id': `${pageUrl}#collection`,
            name: `${company.label} Role Interview Guides`,
            about: [
              { '@type': 'WebPage', url: `${ORIGIN}/interview-questions/companies/solera/software-engineer` },
              { '@type': 'WebPage', url: `${ORIGIN}/interview-questions/companies/solera/java-developer` },
              { '@type': 'WebPage', url: `${ORIGIN}/interview-questions/companies/solera/frontend-developer` },
              { '@type': 'WebPage', url: `${ORIGIN}/interview-questions/companies/solera/qa-engineer` },
              { '@type': 'WebPage', url: `${ORIGIN}/interview-questions/companies/solera/data-analyst` },
            ],
          },
          {
            '@type': 'Article',
            '@id': `${pageUrl}#article`,
            headline: SOLERA_META_TITLE,
            description: SOLERA_DESCRIPTION,
            mainEntityOfPage: { '@id': pageUrl },
            url: pageUrl,
            datePublished: SOLERA_PUBLISHED_DATE,
            dateModified: SOLERA_LAST_UPDATED,
            dateReviewed: SOLERA_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#solera-author` },
            reviewedBy: { '@id': `${ORIGIN}#solera-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: [
              { '@id': `${ORIGIN}${SOLERA_HERO_PATH}#image` },
              { '@id': `${ORIGIN}${SOLERA_PROCESS_PATH}#image` },
            ],
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: [
                'h1',
                '#solera-hub-overview',
                '#solera-hub-recruitment-calendar',
                '#solera-hub-salary',
                '#solera-hub-questions',
              ],
            },
          },
        ],
      }
    : null

  return (
    <>
      <JsonLdScript id="solera-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="solera-faq-ld" data={FAQ_LD} />
      <JsonLdScript id="solera-question-itemlist-ld" data={ITEM_LIST_LD} />
      <JsonLdScript id="solera-page-ld" data={SOLERA_PAGE_LD} />

      <SoleraHubArticle company={company} questions={hubQuestions} />

      <RelatedGuidesSection path={SOLERA_CANONICAL_PATH} />
      {linkSections.map((section) => (
        <SeoCrossLinksSection key={section.heading} heading={section.heading} links={section.links} />
      ))}
    </>
  )
}
