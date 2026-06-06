import type { Metadata } from 'next';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { TopDsaHubArticle } from '@/components/blog/TopDsaHubArticle';

import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { articleJsonLd, breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import {
  TOP_DSA_AUTHOR_NAME,
  TOP_DSA_CANONICAL_PATH,
  TOP_DSA_DESCRIPTION,
  TOP_DSA_FAQ_ITEMS,
  TOP_DSA_HERO_PATH,
  TOP_DSA_LAST_UPDATED,
  TOP_DSA_META_TITLE,
  TOP_DSA_PUBLISHED_DATE,
} from '@/lib/seo/blog/top-dsa-hub';

const ORIGIN = getCanonicalSiteOrigin();
const HERO_URL = `${ORIGIN}${TOP_DSA_HERO_PATH}`;

export const metadata: Metadata = generateMetadata({
  title: TOP_DSA_META_TITLE,
  description: TOP_DSA_DESCRIPTION,
  path: TOP_DSA_CANONICAL_PATH,
  ogImage: HERO_URL,
  socialTitle: brandArticleOgTitle(TOP_DSA_META_TITLE),
  keywords:
    'DSA interview questions, coding interview topics, placement DSA preparation, LeetCode patterns, OA preparation India, top DSA problems 2026',
  openGraphType: 'article',
});

const DSA_ARTICLE_LD = articleJsonLd({
  headline: TOP_DSA_META_TITLE,
  description: TOP_DSA_DESCRIPTION,
  canonicalUrl: canonicalUrl(TOP_DSA_CANONICAL_PATH),
  datePublished: TOP_DSA_PUBLISHED_DATE,
  dateModified: TOP_DSA_LAST_UPDATED,
  authorName: TOP_DSA_AUTHOR_NAME,
  publisherId: schemaIds.organization,
  imageUrl: HERO_URL,
});

const DSA_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'DSA Interview Questions', path: TOP_DSA_CANONICAL_PATH },
  ],
  ORIGIN,
);

const DSA_FAQ_LD = faqPageJsonLd([...TOP_DSA_FAQ_ITEMS]);

export default function TopDsaInterviewQuestionsPage() {
  return (
    <>
      <JsonLdScript id="dsa-article-ld" data={DSA_ARTICLE_LD} />
      <JsonLdScript id="dsa-breadcrumb-ld" data={DSA_BREADCRUMB_LD} />
      <JsonLdScript id="dsa-faq-ld" data={DSA_FAQ_LD} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <TopDsaHubArticle />
      </BlogMarketingShell>
    </>
  );
}
