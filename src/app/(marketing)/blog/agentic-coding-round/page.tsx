import type { Metadata } from 'next'
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell'
import { AgenticCodingRoundArticle } from '@/components/blog/AgenticCodingRoundArticle'
import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { articleJsonLd, breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { AGENTIC_AUTHOR_NAME } from '@/lib/seo/blog/agentic-ai-hub'
import {
  AGENTIC_CODING_ROUND_CONFIG,
  AGENTIC_CODING_ROUND_PATH,
} from '@/lib/seo/blog/agentic-spoke-coding-round'

const ORIGIN = getCanonicalSiteOrigin()
const HERO_URL = `${ORIGIN}${AGENTIC_CODING_ROUND_CONFIG.heroPath}`

export const metadata: Metadata = generateMetadata({
  title: AGENTIC_CODING_ROUND_CONFIG.metaTitle,
  description: AGENTIC_CODING_ROUND_CONFIG.description,
  path: AGENTIC_CODING_ROUND_PATH,
  ogImage: HERO_URL,
  socialTitle: brandArticleOgTitle(AGENTIC_CODING_ROUND_CONFIG.metaTitle),
  keywords: AGENTIC_CODING_ROUND_CONFIG.keywords,
  openGraphType: 'article',
})

const ARTICLE_LD = articleJsonLd({
  headline: AGENTIC_CODING_ROUND_CONFIG.metaTitle,
  description: AGENTIC_CODING_ROUND_CONFIG.description,
  canonicalUrl: canonicalUrl(AGENTIC_CODING_ROUND_PATH),
  datePublished: AGENTIC_CODING_ROUND_CONFIG.publishedDate,
  dateModified: AGENTIC_CODING_ROUND_CONFIG.lastUpdated,
  authorName: AGENTIC_AUTHOR_NAME,
  publisherId: schemaIds.organization,
  imageUrl: HERO_URL,
})

const BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: AGENTIC_CODING_ROUND_CONFIG.breadcrumbLabel, path: AGENTIC_CODING_ROUND_PATH },
  ],
  ORIGIN,
)

const FAQ_LD = faqPageJsonLd([...AGENTIC_CODING_ROUND_CONFIG.faq])

export default function AgenticCodingRoundPage() {
  return (
    <>
      <JsonLdScript id="agentic-coding-round-article-ld" data={ARTICLE_LD} />
      <JsonLdScript id="agentic-coding-round-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="agentic-coding-round-faq-ld" data={FAQ_LD} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <AgenticCodingRoundArticle />
      </BlogMarketingShell>
    </>
  )
}
