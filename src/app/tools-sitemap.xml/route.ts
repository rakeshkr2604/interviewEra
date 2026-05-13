import { NextResponse } from 'next/server';
import { isFullSiteCrawlBlocked } from '@/lib/seo/crawl-policy';
import { buildToolsSitemapEntries } from '@/lib/seo/sitemap/registry';
import { serializeUrlset } from '@/lib/seo/sitemap/serialize';

export const revalidate = 3600;

export async function GET(): Promise<NextResponse> {
  if (isFullSiteCrawlBlocked()) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
      { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
    );
  }

  const xml = serializeUrlset(buildToolsSitemapEntries(new Date()));
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
