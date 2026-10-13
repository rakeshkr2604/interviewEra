import {
  getFeaturedContentEntries,
  getContentByPath,
} from '@/lib/seo/content/registry';
import type { SeoTextLink } from '@/lib/seo/internal-links';
export type { NavResourceItem } from '@/lib/seo/content/nav-links';
export {
  NAV_CAMPUS_ITEMS,
  NAV_TOOLS_LINKS,
  NAV_TOOLS_ITEMS,
  NAV_RESOURCE_ITEMS,
  FOOTER_INTERVIEW_QUESTIONS_LINKS,
  FOOTER_RESOURCES_LINKS,
  resolveNavResource,
} from '@/lib/seo/content/nav-links';

export function getFeaturedGuideLinks(): readonly SeoTextLink[] {
  return getFeaturedContentEntries().map((entry) => ({
    href: entry.path,
    label: entry.title.replace(/ \(2026\)$/, ''),
  }));
}

export function getNavFeaturedPaths(): string[] {
  return getFeaturedContentEntries().map((e) => e.path);
}

export function getResourceHubLink(): SeoTextLink {
  const hub = getContentByPath('/resources');
  return { href: '/resources', label: hub?.title ?? 'Interview Preparation Resources' };
}
