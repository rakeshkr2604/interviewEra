import type { Metadata } from 'next'
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell'
import { AmazonSdeInternArticle } from '@/components/blog/AmazonSdeInternArticle'
import {
  getAdjacentBlogPosts,
  getBlogRelatedCards,
} from '@/components/blog/design-system'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import {
  AMAZON_SDE_INTERN_AUTHOR,
  AMAZON_SDE_INTERN_CANONICAL_PATH,
  AMAZON_SDE_INTERN_FAQS,
  AMAZON_SDE_INTERN_HERO_PATH,
  AMAZON_SDE_INTERN_HOWTO_STEPS,
  AMAZON_SDE_INTERN_KEYWORDS,
  AMAZON_SDE_INTERN_LAST_UPDATED,
  AMAZON_SDE_INTERN_META_DESCRIPTION,
  AMAZON_SDE_INTERN_META_TITLE,
  AMAZON_SDE_INTERN_PUBLISHED,
} from '@/lib/seo/blog/amazon-sde-intern-2026'
import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata'
import {
  articleJsonLd,
  breadcrumbListJsonLd,
  faqPageJsonLd,
  howToJsonLd,
} from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'

const ORIGIN = getCanonicalSiteOrigin()
const HERO_ABS = `${ORIGIN}${AMAZON_SDE_INTERN_HERO_PATH}`
const CANONICAL = canonicalUrl(AMAZON_SDE_INTERN_CANONICAL_PATH)

export const metadata: Metadata = generateMetadata({
  title: AMAZON_SDE_INTERN_META_TITLE,
  description: AMAZON_SDE_INTERN_META_DESCRIPTION,
  path: AMAZON_SDE_INTERN_CANONICAL_PATH,
  ogImage: HERO_ABS,
  socialTitle: brandArticleOgTitle(AMAZON_SDE_INTERN_META_TITLE),
  keywords: AMAZON_SDE_INTERN_KEYWORDS,
  openGraphType: 'article',
})

const ARTICLE_LD = articleJsonLd({
  headline: AMAZON_SDE_INTERN_META_TITLE,
  description: AMAZON_SDE_INTERN_META_DESCRIPTION,
  canonicalUrl: CANONICAL,
  datePublished: AMAZON_SDE_INTERN_PUBLISHED,
  dateModified: AMAZON_SDE_INTERN_LAST_UPDATED,
  authorName: AMAZON_SDE_INTERN_AUTHOR,
  publisherId: schemaIds.organization,
  imageUrl: HERO_ABS,
})

const BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'Interview Experiences', path: '/blog' },
    {
      name: 'Amazon SDE I Intern Interview Experience 2026',
      path: AMAZON_SDE_INTERN_CANONICAL_PATH,
    },
  ],
  ORIGIN,
)

const FAQ_LD = faqPageJsonLd([...AMAZON_SDE_INTERN_FAQS])

const HOWTO_LD = howToJsonLd(
  'How to prepare for Amazon SDE Intern interviews in 30 days',
  'A four-week preparation plan covering DSA patterns, Online Assessment simulation, Leadership Principles STAR stories, and mock interviews.',
  [...AMAZON_SDE_INTERN_HOWTO_STEPS],
)

const SPEAKABLE_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  url: CANONICAL,
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.ie-blog-ds-hero__deck', '#key-takeaways', '#faq'],
  },
}

const RELATED = getBlogRelatedCards(AMAZON_SDE_INTERN_CANONICAL_PATH, 3)
const { previous, next } = getAdjacentBlogPosts(AMAZON_SDE_INTERN_CANONICAL_PATH)

export default function AmazonSdeInternInterviewExperience2026Page() {
  return (
    <>
      {ARTICLE_LD ? <JsonLdScript id="amazon-sde-intern-article-ld" data={ARTICLE_LD} /> : null}
      <JsonLdScript id="amazon-sde-intern-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="amazon-sde-intern-faq-ld" data={FAQ_LD} />
      <JsonLdScript id="amazon-sde-intern-howto-ld" data={HOWTO_LD} />
      <JsonLdScript id="amazon-sde-intern-speakable-ld" data={SPEAKABLE_LD} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <AmazonSdeInternArticle related={RELATED} previous={previous} next={next} />
      </BlogMarketingShell>
    </>
  )
}
