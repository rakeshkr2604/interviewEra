import type { MetadataRoute } from 'next';
import { isFullSiteCrawlBlocked } from '@/lib/seo/crawl-policy';
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
        disallow: [
          '/dashboard',
          '/onboarding',
          '/interview/',
          '/report/',
          '/history',
          '/analytics',
          '/settings',
          '/upgrade',
          '/feedback',
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
