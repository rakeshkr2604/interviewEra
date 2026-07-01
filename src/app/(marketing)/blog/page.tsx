import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { BlogIndexExplorer } from '@/components/content/BlogIndexExplorer';
import { MarketingPageHeader } from '@/components/layout/MarketingPageHeader';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { MARKETING_SECTION_GAP } from '@/lib/landing/container';
import { generateMetadata } from '@/lib/seo/metadata';
import { breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import {
  getBlogContentEntries,
  getFeaturedContentEntries,
  getLatestBlogContent,
  getPopularContentEntries,
  getRecentlyUpdatedContent,
} from '@/lib/seo/content/registry';

export const metadata: Metadata = generateMetadata({
  title: 'Blog',
  description:
    'Practical interview preparation guides: DSA topic maps, HR answer frameworks, placement prep, STAR method, and software engineer interview questions.',
  path: '/blog',
});

export const revalidate = 3600;

const ORIGIN = getCanonicalSiteOrigin();

const BLOG_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
  ],
  ORIGIN,
);

export default function BlogIndexPage() {
  const allPosts = [...getBlogContentEntries()].sort((a, b) =>
    b.lastModified.localeCompare(a.lastModified),
  );
  const featured = getFeaturedContentEntries().filter((e) =>
    ['blog', 'role-hub', 'company-role-hub'].includes(e.type),
  );
  const latest = getLatestBlogContent(5);
  const popular = getPopularContentEntries()
    .filter((e) => e.type === 'blog')
    .slice(0, 5);
  const recentlyUpdated = getRecentlyUpdatedContent(5).filter((e) => e.type === 'blog');

  return (
    <>
      <JsonLdScript id="blog-index-breadcrumb-ld" data={BLOG_BREADCRUMB_LD} />
      <BlogMarketingShell backHref="/resources" backLabel="All resources">
        <div className={MARKETING_SECTION_GAP}>
          <MarketingPageHeader
            eyebrow="Blog"
            eyebrowIcon={BookOpen}
            title="Interview preparation guides"
            subtitle="Actionable articles for placement and software interview prep — written for Indian students and early-career engineers."
          />

          <BlogIndexExplorer
            allPosts={allPosts}
            featured={featured}
            latest={latest}
            popular={popular}
            recentlyUpdated={recentlyUpdated}
          />
        </div>
      </BlogMarketingShell>
    </>
  );
}
