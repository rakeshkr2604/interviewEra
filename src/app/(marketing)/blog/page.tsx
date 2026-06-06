import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { BlogIndexExplorer } from '@/components/content/BlogIndexExplorer';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
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
        <div className="space-y-12 sm:space-y-16 lg:space-y-20">
          <header className="mx-auto max-w-3xl text-center lg:max-w-4xl">
            <div
              className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide sm:mb-6"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                color: 'var(--text-primary)',
              }}
            >
              <BookOpen className="size-3.5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
              Blog
            </div>
            <h1 className="text-balance text-[2rem] font-bold leading-[1.08] tracking-tight sm:text-4xl md:text-5xl md:leading-[1.05]">
              Interview preparation guides
            </h1>
            <p
              className="mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:mt-5 sm:text-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              Actionable articles for placement and software interview prep — written for Indian students and
              early-career engineers.
            </p>
          </header>

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
