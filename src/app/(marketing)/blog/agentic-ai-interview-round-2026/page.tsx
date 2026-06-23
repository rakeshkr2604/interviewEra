import type { Metadata } from 'next';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { AgenticAiHubArticle } from '@/components/blog/AgenticAiHubArticle';

import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { articleJsonLd, breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import {
  AGENTIC_AUTHOR_NAME,
  AGENTIC_CANONICAL_PATH,
  AGENTIC_DESCRIPTION,
  AGENTIC_HERO_PATH,
  AGENTIC_LAST_UPDATED,
  AGENTIC_META_TITLE,
  AGENTIC_PUBLISHED_DATE,
} from '@/lib/seo/blog/agentic-ai-hub';
import { AGENTIC_FAQ_ITEMS } from '@/lib/seo/blog/agentic-ai-hub-faq';

const ORIGIN = getCanonicalSiteOrigin();
const HERO_URL = `${ORIGIN}${AGENTIC_HERO_PATH}`;

export const metadata: Metadata = generateMetadata({
  title: AGENTIC_META_TITLE,
  description: AGENTIC_DESCRIPTION,
  path: AGENTIC_CANONICAL_PATH,
  ogImage: HERO_URL,
  socialTitle: brandArticleOgTitle(AGENTIC_META_TITLE),
  keywords:
    'agentic AI interview round, agentic coding round, AI assisted coding interview, AI coding interview, Cursor interview, Claude coding interview, ChatGPT coding interview, human AI collaboration interview, AI native engineering, AI pair programming interview',
  openGraphType: 'article',
});

const AGENTIC_ARTICLE_LD = articleJsonLd({
  headline: AGENTIC_META_TITLE,
  description: AGENTIC_DESCRIPTION,
  canonicalUrl: canonicalUrl(AGENTIC_CANONICAL_PATH),
  datePublished: AGENTIC_PUBLISHED_DATE,
  dateModified: AGENTIC_LAST_UPDATED,
  authorName: AGENTIC_AUTHOR_NAME,
  publisherId: schemaIds.organization,
  imageUrl: HERO_URL,
});

const AGENTIC_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'Agentic AI Interview Round', path: AGENTIC_CANONICAL_PATH },
  ],
  ORIGIN,
);

const AGENTIC_FAQ_LD = faqPageJsonLd([...AGENTIC_FAQ_ITEMS]);

export default function AgenticAiInterviewRound2026Page() {
  return (
    <>
      <JsonLdScript id="agentic-article-ld" data={AGENTIC_ARTICLE_LD} />
      <JsonLdScript id="agentic-breadcrumb-ld" data={AGENTIC_BREADCRUMB_LD} />
      <JsonLdScript id="agentic-faq-ld" data={AGENTIC_FAQ_LD} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <AgenticAiHubArticle />
      </BlogMarketingShell>
    </>
  );
}
