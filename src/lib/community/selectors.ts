import type { CommunityPlatform, CommunitySurface } from './types';
import { COMMUNITY_PLATFORMS } from './community';
import { isRenderablePlatformUrl, sanitizeCommunityUrl } from './urls';

const SURFACE_FLAG: Record<CommunitySurface, keyof CommunityPlatform> = {
  landing: 'showOnLanding',
  dashboard: 'showOnDashboard',
  widget: 'showInWidget',
  footer: 'showInFooter',
  communityPage: 'showOnCommunityPage',
};

function isActivePlatform(p: CommunityPlatform): boolean {
  if (!p.enabled) return false;
  if (p.comingSoon) return true;
  return sanitizeCommunityUrl(p.url) !== null;
}

function isClickablePlatform(p: CommunityPlatform): boolean {
  if (!p.enabled || p.comingSoon) return false;
  return isRenderablePlatformUrl(p.url, false);
}

export function sortPlatforms(platforms: CommunityPlatform[]): CommunityPlatform[] {
  return [...platforms].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.displayOrder - b.displayOrder;
  });
}

export function getPlatformsForSurface(surface: CommunitySurface): CommunityPlatform[] {
  const flag = SURFACE_FLAG[surface];
  return sortPlatforms(COMMUNITY_PLATFORMS.filter((p) => isActivePlatform(p) && p[flag]));
}

export function getClickablePlatformsForSurface(surface: CommunitySurface): CommunityPlatform[] {
  const flag = SURFACE_FLAG[surface];
  return sortPlatforms(
    COMMUNITY_PLATFORMS.filter((p) => isClickablePlatform(p) && p[flag]),
  );
}

export function getPrimaryCommunityPlatform(): CommunityPlatform | undefined {
  return getClickablePlatformsForSurface('landing').find(
    (p) => p.category === 'community' || p.category === 'channel',
  );
}

export function getHubPlatformsBySection(
  section: CommunityPlatform['hubSection'],
): CommunityPlatform[] {
  if (!section) return [];
  return sortPlatforms(
    COMMUNITY_PLATFORMS.filter(
      (p) =>
        p.enabled &&
        p.showOnCommunityPage &&
        p.hubSection === section &&
        !p.showInConnectSection,
    ),
  );
}

export function getConnectSectionPlatforms(): CommunityPlatform[] {
  return COMMUNITY_PLATFORMS.filter((p) => p.enabled && p.showInConnectSection).sort(
    (a, b) => (a.connectOrder ?? 99) - (b.connectOrder ?? 99),
  );
}

export function isConnectRowClickable(platform: CommunityPlatform): boolean {
  if (platform.connectDisabled || platform.comingSoon) return false;
  return sanitizeCommunityUrl(platform.url) !== null;
}
