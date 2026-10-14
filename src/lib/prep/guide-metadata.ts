import type { Metadata } from 'next'
import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata'
import { articleJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { PREP_GUIDES, PREP_UPDATED, type PrepGuideKey } from '@/lib/prep/guides'

const ORIGIN = getCanonicalSiteOrigin()

export function prepGuideMetadata(key: PrepGuideKey): Metadata {
  const guide = PREP_GUIDES[key]
  return generateMetadata({
    title: guide.metaTitle,
    description: guide.description,
    path: guide.path,
    socialTitle: brandArticleOgTitle(guide.metaTitle),
    keywords: [
      'interview preparation',
      'InterviewEra',
      guide.metaTitle,
    ],
    openGraphType: 'article',
  })
}

export function prepGuideStructuredData(key: PrepGuideKey) {
  const guide = PREP_GUIDES[key]
  return {
    article: articleJsonLd({
      headline: guide.title,
      description: guide.description,
      canonicalUrl: canonicalUrl(guide.path),
      datePublished: PREP_UPDATED,
      dateModified: PREP_UPDATED,
      authorName: 'InterviewEra Team',
      publisherId: schemaIds.organization,
    }),
    breadcrumb: breadcrumbListJsonLd(
      [
        { name: 'Home', path: '/' },
        { name: 'Resources', path: '/resources' },
        { name: guide.metaTitle, path: guide.path },
      ],
      ORIGIN,
    ),
  }
}
