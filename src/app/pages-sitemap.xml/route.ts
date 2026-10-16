import { NextResponse } from 'next/server';
import { getCampusLandingMode } from '@/lib/campus/campus-landing-mode';
import { getTeamsLandingMode } from '@/lib/hiring/teams-landing-mode';
import { isFullSiteCrawlBlocked } from '@/lib/seo/crawl-policy';
import { buildPagesSitemapEntries } from '@/lib/seo/sitemap/registry';
import { serializeUrlset } from '@/lib/seo/sitemap/serialize';

/** Redis-backed campus/teams mode — must not be statically cached across toggles. */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  if (isFullSiteCrawlBlocked()) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
      { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
    );
  }

  const [campusMode, teamsMode] = await Promise.all([
    getCampusLandingMode(),
    getTeamsLandingMode(),
  ]);

  const xml = serializeUrlset(
    buildPagesSitemapEntries(undefined, { campusMode, teamsMode }),
  );
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
