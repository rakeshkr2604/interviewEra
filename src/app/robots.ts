import type { MetadataRoute } from 'next';
import { isFullSiteCrawlBlocked } from '@/lib/seo/crawl-policy';
import { ROBOTS_DISALLOW_PREFIXES } from '@/lib/seo/robots-rules';
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url';

const BASE_URL = getCanonicalSiteOrigin();

export default function robots(): MetadataRoute.Robots {
  if (isFullSiteCrawlBlocked()) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...ROBOTS_DISALLOW_PREFIXES],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
