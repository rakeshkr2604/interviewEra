import type { Metadata } from 'next'
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell'
import { WhatIsAgenticAiArticle } from '@/components/blog/WhatIsAgenticAiArticle'
import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { articleJsonLd, breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { AGENTIC_AUTHOR_NAME } from '@/lib/seo/blog/agentic-ai-hub'
import {
  WHAT_IS_AGENTIC_AI_CONFIG,
  WHAT_IS_AGENTIC_AI_PATH,
} from '@/lib/seo/blog/agentic-spoke-what-is'

const ORIGIN = getCanonicalSiteOrigin()
const HERO_URL = `${ORIGIN}${WHAT_IS_AGENTIC_AI_CONFIG.heroPath}`

export const metadata: Metadata = generateMetadata({
  title: WHAT_IS_AGENTIC_AI_CONFIG.metaTitle,
  description: WHAT_IS_AGENTIC_AI_CONFIG.description,
  path: WHAT_IS_AGENTIC_AI_PATH,
  ogImage: HERO_URL,
  socialTitle: brandArticleOgTitle(WHAT_IS_AGENTIC_AI_CONFIG.metaTitle),
  keywords: WHAT_IS_AGENTIC_AI_CONFIG.keywords,
  openGraphType: 'article',
})

const ARTICLE_LD = articleJsonLd({
  headline: WHAT_IS_AGENTIC_AI_CONFIG.metaTitle,
  description: WHAT_IS_AGENTIC_AI_CONFIG.description,
  canonicalUrl: canonicalUrl(WHAT_IS_AGENTIC_AI_PATH),
  datePublished: WHAT_IS_AGENTIC_AI_CONFIG.publishedDate,
  dateModified: WHAT_IS_AGENTIC_AI_CONFIG.lastUpdated,
  authorName: AGENTIC_AUTHOR_NAME,
  publisherId: schemaIds.organization,
  imageUrl: HERO_URL,
})

const BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: WHAT_IS_AGENTIC_AI_CONFIG.breadcrumbLabel, path: WHAT_IS_AGENTIC_AI_PATH },
  ],
  ORIGIN,
)

const FAQ_LD = faqPageJsonLd([...WHAT_IS_AGENTIC_AI_CONFIG.faq])

export default function WhatIsAgenticAiPage() {
  return (
    <>
      <JsonLdScript id="what-is-agentic-ai-article-ld" data={ARTICLE_LD} />
      <JsonLdScript id="what-is-agentic-ai-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="what-is-agentic-ai-faq-ld" data={FAQ_LD} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <WhatIsAgenticAiArticle />
      </BlogMarketingShell>
    </>
  )
}
