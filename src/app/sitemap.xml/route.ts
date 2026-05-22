import { NextResponse } from 'next/server';
import { isFullSiteCrawlBlocked } from '@/lib/seo/crawl-policy';
import { CHILD_SITEMAP_LOCS } from '@/lib/seo/sitemap/registry';
import { serializeSitemapIndex } from '@/lib/seo/sitemap/serialize';

export const revalidate = 3600;

export async function GET(): Promise<NextResponse> {
  if (isFullSiteCrawlBlocked()) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
      {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      },
    );
  }

  const now = new Date();
  const xml = serializeSitemapIndex([
    { loc: CHILD_SITEMAP_LOCS.pages, lastmod: now },
    { loc: CHILD_SITEMAP_LOCS.blog, lastmod: now },
    { loc: CHILD_SITEMAP_LOCS.tools, lastmod: now },
    { loc: CHILD_SITEMAP_LOCS.questions, lastmod: now },
  ]);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
