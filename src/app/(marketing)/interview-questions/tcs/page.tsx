import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { TcsHubArticle } from '@/components/programmatic/TcsHubArticle'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import { RelatedGuidesSection } from '@/components/content/RelatedGuidesSection'
import { generateMetadata as baseGenerateMetadata } from '@/lib/seo/metadata'
import { schemaIds } from '@/lib/seo/metadata'
import { getCompanyBySlug, getCompanyQuestionsFlat, questionsHubPath } from '@/lib/seo/programmatic'
import { buildCompanyPageLinks } from '@/lib/seo/internal-linking'
import {
  TCS_AUTHOR_NAME,
  TCS_CANONICAL_PATH,
  TCS_DESCRIPTION,
  TCS_FAQ_ITEMS,
  TCS_HERO_ALT,
  TCS_HERO_HEIGHT,
  TCS_HERO_PATH,
  TCS_HERO_WIDTH,
  TCS_LAST_UPDATED,
  TCS_META_TITLE,
  TCS_PROCESS_ALT,
  TCS_PROCESS_HEIGHT,
  TCS_PROCESS_PATH,
  TCS_PROCESS_WIDTH,
  TCS_PUBLISHED_DATE,
  TCS_REVIEWED_DATE,
  TCS_REVIEWER_NAME,
} from '@/lib/seo/programmatic/tcs-hub'
import '../../blog/blog.css'

const ORIGIN = getCanonicalSiteOrigin()

export async function generateMetadata(): Promise<Metadata> {
  return baseGenerateMetadata({
    title: TCS_META_TITLE,
    description: TCS_DESCRIPTION,
    path: TCS_CANONICAL_PATH,
    ogImage: `${ORIGIN}${TCS_HERO_PATH}`,
    keywords: [
      'TCS interview questions',
      'TCS interview questions 2026',
      'TCS NQT preparation',
      'TCS campus placement',
      'TCS Digital vs Prime',
      'TCS aptitude questions',
      'TCS technical interview',
      'TCS HR interview questions',
      'TCS interview process India',
      'TCS mock interview',
    ],
    openGraphType: 'article',
    noIndex: false,
  })
}

export default function TcsInterviewHubPage() {
  const company = getCompanyBySlug('tcs')
  if (!company) notFound()

  const questions = getCompanyQuestionsFlat('tcs')
  const linkSections = buildCompanyPageLinks(company)

  const BREADCRUMB_LD = breadcrumbListJsonLd(
    [
      { name: 'Interview Questions', path: questionsHubPath() },
      { name: company.label, path: TCS_CANONICAL_PATH },
    ],
    ORIGIN,
  )

  const FAQ_LD = faqPageJsonLd([...TCS_FAQ_ITEMS])

  const ITEM_LIST_LD =
    questions.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListOrder: 'https://schema.org/ItemListOrderAscending',
          name: `${company.label} interview questions`,
          url: canonicalUrl(TCS_CANONICAL_PATH),
          numberOfItems: questions.length,
          itemListElement: questions.map((q, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: q.question,
          })),
        }
      : null

  const TCS_PAGE_LD = {
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
        '@id': `${ORIGIN}#tcs-author`,
        name: TCS_AUTHOR_NAME,
        worksFor: { '@id': schemaIds.organization },
      },
      {
        '@type': 'Person',
        '@id': `${ORIGIN}#tcs-reviewer`,
        name: TCS_REVIEWER_NAME,
        worksFor: { '@id': schemaIds.organization },
      },
      {
        '@type': 'ImageObject',
        '@id': `${ORIGIN}${TCS_HERO_PATH}#image`,
        url: `${ORIGIN}${TCS_HERO_PATH}`,
        contentUrl: `${ORIGIN}${TCS_HERO_PATH}`,
        caption: TCS_HERO_ALT,
        width: TCS_HERO_WIDTH,
        height: TCS_HERO_HEIGHT,
      },
      {
        '@type': 'ImageObject',
        '@id': `${ORIGIN}${TCS_PROCESS_PATH}#image`,
        url: `${ORIGIN}${TCS_PROCESS_PATH}`,
        contentUrl: `${ORIGIN}${TCS_PROCESS_PATH}`,
        caption: TCS_PROCESS_ALT,
        width: TCS_PROCESS_WIDTH,
        height: TCS_PROCESS_HEIGHT,
      },
      {
        '@type': 'WebPage',
        '@id': canonicalUrl(TCS_CANONICAL_PATH),
        url: canonicalUrl(TCS_CANONICAL_PATH),
        name: TCS_META_TITLE,
        isPartOf: { '@id': `${ORIGIN}#website` },
        primaryImageOfPage: { '@id': `${ORIGIN}${TCS_HERO_PATH}#image` },
        mainEntity: { '@id': `${canonicalUrl(TCS_CANONICAL_PATH)}#article` },
        inLanguage: 'en-IN',
      },
      {
        '@type': 'Article',
        '@id': `${canonicalUrl(TCS_CANONICAL_PATH)}#article`,
        headline: TCS_META_TITLE,
        description: TCS_DESCRIPTION,
        mainEntityOfPage: { '@id': canonicalUrl(TCS_CANONICAL_PATH) },
        url: canonicalUrl(TCS_CANONICAL_PATH),
        datePublished: TCS_PUBLISHED_DATE,
        dateModified: TCS_LAST_UPDATED,
        dateReviewed: TCS_REVIEWED_DATE,
        author: { '@id': `${ORIGIN}#tcs-author` },
        reviewedBy: { '@id': `${ORIGIN}#tcs-reviewer` },
        publisher: { '@id': schemaIds.organization },
        image: [
          { '@id': `${ORIGIN}${TCS_HERO_PATH}#image` },
          { '@id': `${ORIGIN}${TCS_PROCESS_PATH}#image` },
        ],
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '#tcs-nqt-pattern', '#tcs-topic-importance', '#tcs-questions'],
        },
      },
    ],
  }

  return (
    <>
      <JsonLdScript id="tcs-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="tcs-faq-ld" data={FAQ_LD} />
      {ITEM_LIST_LD ? <JsonLdScript id="tcs-question-itemlist-ld" data={ITEM_LIST_LD} /> : null}
      <JsonLdScript id="tcs-page-ld" data={TCS_PAGE_LD} />

      <TcsHubArticle company={company} questions={questions} />

      <RelatedGuidesSection path={TCS_CANONICAL_PATH} />
      {linkSections.map((section) => (
        <SeoCrossLinksSection key={section.heading} heading={section.heading} links={section.links} />
      ))}
    </>
  )
}
