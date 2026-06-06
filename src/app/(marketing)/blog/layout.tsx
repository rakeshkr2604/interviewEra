import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BlogRelatedToolsStrip } from '@/components/seo/BlogRelatedToolsStrip';
import { RelatedGuidesStrip } from '@/components/content/RelatedGuidesStrip';

import { siteConfig } from '@/lib/seo/metadata';
// Route-scoped: blog article typography loads only on /blog/* (not in the global bundle).
import './blog.css';

/**
 * Browser tab titles for posts: `{post title} | InterviewEra` (brand-last for scanning on index pages).
 */
export const metadata: Metadata = {
  title: {
    default: `Blog | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`,
  },
};

export default function MarketingBlogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <RelatedGuidesStrip />
      <BlogRelatedToolsStrip />
    </>
  );
}
