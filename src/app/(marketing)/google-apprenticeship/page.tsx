import type { Metadata } from 'next'
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell'
import { GoogleApprenticeshipArticle } from '@/components/content/GoogleApprenticeshipArticle'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import {
  GOOGLE_APPRENTICESHIP_AUTHOR_NAME,
  GOOGLE_APPRENTICESHIP_CANONICAL_PATH,
  GOOGLE_APPRENTICESHIP_DESCRIPTION,
  GOOGLE_APPRENTICESHIP_FAQ_ITEMS,
  GOOGLE_APPRENTICESHIP_LAST_UPDATED,
  GOOGLE_APPRENTICESHIP_META_TITLE,
  GOOGLE_APPRENTICESHIP_PUBLISHED_DATE,
} from '@/lib/seo/content/google-apprenticeship-hub'
import { brandArticleOgTitle, generateMetadata, schemaIds, siteConfig } from '@/lib/seo/metadata'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import '../blog/blog.css'

const ORIGIN = getCanonicalSiteOrigin()
const PAGE_URL = canonicalUrl(GOOGLE_APPRENTICESHIP_CANONICAL_PATH)

export const metadata: Metadata = generateMetadata({
  title: GOOGLE_APPRENTICESHIP_META_TITLE,
  description: GOOGLE_APPRENTICESHIP_DESCRIPTION,
  path: GOOGLE_APPRENTICESHIP_CANONICAL_PATH,
  socialTitle: brandArticleOgTitle(GOOGLE_APPRENTICESHIP_META_TITLE),
  keywords: [
    'Google Apprenticeship 2026',
    'Google Apprenticeship India',
    'Google Apprenticeship last date',
    'Google Apprenticeship eligibility',
    'Google Apprenticeship salary',
    'Google Apprenticeship application',
    'Google Apprenticeship Data Analytics',
    'Google Apprenticeship Software Development',
    'Google Apprenticeship deadline August 2026',
  ],
  openGraphType: 'article',
  noIndex: false,
})

const BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Resources', path: '/resources' },
    { name: 'Google Apprenticeship 2026', path: GOOGLE_APPRENTICESHIP_CANONICAL_PATH },
  ],
  ORIGIN,
)

const FAQ_LD = faqPageJsonLd([...GOOGLE_APPRENTICESHIP_FAQ_ITEMS])

const ARTICLE_LD = PAGE_URL
  ? {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: GOOGLE_APPRENTICESHIP_META_TITLE,
      description: GOOGLE_APPRENTICESHIP_DESCRIPTION,
      mainEntityOfPage: { '@type': 'WebPage', '@id': PAGE_URL },
      url: PAGE_URL,
      datePublished: GOOGLE_APPRENTICESHIP_PUBLISHED_DATE,
      dateModified: GOOGLE_APPRENTICESHIP_LAST_UPDATED,
      inLanguage: 'en-IN',
      author: {
        '@type': 'Person',
        name: GOOGLE_APPRENTICESHIP_AUTHOR_NAME,
        affiliation: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
      },
      publisher: { '@id': schemaIds.organization },
    }
  : null

export default function GoogleApprenticeshipPage() {
  return (
    <>
      <JsonLdScript id="google-apprenticeship-article-ld" data={ARTICLE_LD} />
      <JsonLdScript id="google-apprenticeship-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="google-apprenticeship-faq-ld" data={FAQ_LD} />
      <BlogMarketingShell backHref="/resources" backLabel="All resources">
        <GoogleApprenticeshipArticle />
      </BlogMarketingShell>
    </>
  )
}
