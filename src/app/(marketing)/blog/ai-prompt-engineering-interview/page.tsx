import type { Metadata } from 'next'
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell'
import { AiPromptEngineeringArticle } from '@/components/blog/AiPromptEngineeringArticle'
import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { articleJsonLd, breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { AGENTIC_AUTHOR_NAME } from '@/lib/seo/blog/agentic-ai-hub'
import {
  AI_PROMPT_ENGINEERING_CONFIG,
  AI_PROMPT_ENGINEERING_PATH,
} from '@/lib/seo/blog/agentic-spoke-prompt-engineering'

const ORIGIN = getCanonicalSiteOrigin()
const HERO_URL = `${ORIGIN}${AI_PROMPT_ENGINEERING_CONFIG.heroPath}`

export const metadata: Metadata = generateMetadata({
  title: AI_PROMPT_ENGINEERING_CONFIG.metaTitle,
  description: AI_PROMPT_ENGINEERING_CONFIG.description,
  path: AI_PROMPT_ENGINEERING_PATH,
  ogImage: HERO_URL,
  socialTitle: brandArticleOgTitle(AI_PROMPT_ENGINEERING_CONFIG.metaTitle),
  keywords: AI_PROMPT_ENGINEERING_CONFIG.keywords,
  openGraphType: 'article',
})

const ARTICLE_LD = articleJsonLd({
  headline: AI_PROMPT_ENGINEERING_CONFIG.metaTitle,
  description: AI_PROMPT_ENGINEERING_CONFIG.description,
  canonicalUrl: canonicalUrl(AI_PROMPT_ENGINEERING_PATH),
  datePublished: AI_PROMPT_ENGINEERING_CONFIG.publishedDate,
  dateModified: AI_PROMPT_ENGINEERING_CONFIG.lastUpdated,
  authorName: AGENTIC_AUTHOR_NAME,
  publisherId: schemaIds.organization,
  imageUrl: HERO_URL,
})

const BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: AI_PROMPT_ENGINEERING_CONFIG.breadcrumbLabel, path: AI_PROMPT_ENGINEERING_PATH },
  ],
  ORIGIN,
)

const FAQ_LD = faqPageJsonLd([...AI_PROMPT_ENGINEERING_CONFIG.faq])

export default function AiPromptEngineeringInterviewPage() {
  return (
    <>
      <JsonLdScript id="ai-prompt-engineering-article-ld" data={ARTICLE_LD} />
      <JsonLdScript id="ai-prompt-engineering-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="ai-prompt-engineering-faq-ld" data={FAQ_LD} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <AiPromptEngineeringArticle />
      </BlogMarketingShell>
    </>
  )
}
