import type { MetadataRoute } from 'next';
import { isValidAbsoluteUrl } from '@/lib/seo/url-safety';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatLastMod(value: string | Date | undefined): string | undefined {
  if (value === undefined) return undefined;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** Serializes Next `MetadataRoute.Sitemap` entries to sitemap.org `urlset` XML. */
export function serializeUrlset(entries: MetadataRoute.Sitemap): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of entries) {
    if (!isValidAbsoluteUrl(entry.url)) continue;
    const loc = escapeXml(entry.url);
    const lastmod = formatLastMod(entry.lastModified);
    const cf = entry.changeFrequency ? escapeXml(entry.changeFrequency) : undefined;
    const pr =
      entry.priority !== undefined && entry.priority !== null
        ? String(entry.priority)
        : undefined;

    lines.push('  <url>');
    lines.push(`    <loc>${loc}</loc>`);
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    if (cf) lines.push(`    <changefreq>${cf}</changefreq>`);
    if (pr) lines.push(`    <priority>${pr}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n');
}

export interface SitemapIndexLoc {
  loc: string;
  lastmod?: string | Date;
}

/** Sitemap index XML pointing at child sitemaps. */
export function serializeSitemapIndex(children: SitemapIndexLoc[]): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const child of children) {
    if (!isValidAbsoluteUrl(child.loc)) continue;
    const loc = escapeXml(child.loc);
    const lastmod = formatLastMod(child.lastmod);
    lines.push('  <sitemap>');
    lines.push(`    <loc>${loc}</loc>`);
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('  </sitemap>');
  }

  lines.push('</sitemapindex>');
  return lines.join('\n');
}
