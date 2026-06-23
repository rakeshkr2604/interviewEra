import type { Metadata } from 'next'
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell'
import { CursorAiInterviewArticle } from '@/components/blog/CursorAiInterviewArticle'
import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { articleJsonLd, breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { AGENTIC_AUTHOR_NAME } from '@/lib/seo/blog/agentic-ai-hub'
import {
  CURSOR_AI_INTERVIEW_CONFIG,
  CURSOR_AI_INTERVIEW_PATH,
} from '@/lib/seo/blog/agentic-spoke-cursor'

const ORIGIN = getCanonicalSiteOrigin()
const HERO_URL = `${ORIGIN}${CURSOR_AI_INTERVIEW_CONFIG.heroPath}`

export const metadata: Metadata = generateMetadata({
  title: CURSOR_AI_INTERVIEW_CONFIG.metaTitle,
  description: CURSOR_AI_INTERVIEW_CONFIG.description,
  path: CURSOR_AI_INTERVIEW_PATH,
  ogImage: HERO_URL,
  socialTitle: brandArticleOgTitle(CURSOR_AI_INTERVIEW_CONFIG.metaTitle),
  keywords: CURSOR_AI_INTERVIEW_CONFIG.keywords,
  openGraphType: 'article',
})

const ARTICLE_LD = articleJsonLd({
  headline: CURSOR_AI_INTERVIEW_CONFIG.metaTitle,
  description: CURSOR_AI_INTERVIEW_CONFIG.description,
  canonicalUrl: canonicalUrl(CURSOR_AI_INTERVIEW_PATH),
  datePublished: CURSOR_AI_INTERVIEW_CONFIG.publishedDate,
  dateModified: CURSOR_AI_INTERVIEW_CONFIG.lastUpdated,
  authorName: AGENTIC_AUTHOR_NAME,
  publisherId: schemaIds.organization,
  imageUrl: HERO_URL,
})

const BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: CURSOR_AI_INTERVIEW_CONFIG.breadcrumbLabel, path: CURSOR_AI_INTERVIEW_PATH },
  ],
  ORIGIN,
)

const FAQ_LD = faqPageJsonLd([...CURSOR_AI_INTERVIEW_CONFIG.faq])

export default function CursorAiInterviewGuidePage() {
  return (
    <>
      <JsonLdScript id="cursor-ai-interview-article-ld" data={ARTICLE_LD} />
      <JsonLdScript id="cursor-ai-interview-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="cursor-ai-interview-faq-ld" data={FAQ_LD} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <CursorAiInterviewArticle />
      </BlogMarketingShell>
    </>
  )
}
