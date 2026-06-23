import type { CommunityPlatformId } from './types';
import { notifyCommunityStorageChange } from './storage-events';

const KEYS = {
  bannerDismissed: 'ie-community-banner-dismissed-at',
  widgetDismissed: 'ie-community-widget-dismissed-at',
  joinedPlatforms: 'ie-community-joined-platforms',
  dashboardCardDismissed: 'ie-community-dashboard-card-dismissed-at',
  placementShown: 'ie-community-placement-shown',
} as const;

/** Banner re-appears after 14 days if user hasn't joined */
const BANNER_DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private browsing */
  }
}

function readJson<T>(key: string, fallback: T): T {
  const raw = readStorage(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getJoinedPlatforms(): CommunityPlatformId[] {
  return readJson<CommunityPlatformId[]>(KEYS.joinedPlatforms, []);
}

export function markPlatformJoined(id: CommunityPlatformId): void {
  const current = getJoinedPlatforms();
  if (current.includes(id)) return;
  writeStorage(KEYS.joinedPlatforms, JSON.stringify([...current, id]));
  notifyCommunityStorageChange();
}

export function hasJoinedCommunity(): boolean {
  return getJoinedPlatforms().length > 0;
}

export function isBannerDismissed(): boolean {
  const at = readStorage(KEYS.bannerDismissed);
  if (!at) return false;
  const dismissedAt = Number(at);
  if (!Number.isFinite(dismissedAt)) return true;
  return Date.now() - dismissedAt < BANNER_DISMISS_TTL_MS;
}

export function dismissBanner(): void {
  writeStorage(KEYS.bannerDismissed, String(Date.now()));
  notifyCommunityStorageChange();
}

export function isWidgetDismissed(): boolean {
  return readStorage(KEYS.widgetDismissed) === '1';
}

export function dismissWidget(): void {
  writeStorage(KEYS.widgetDismissed, '1');
  notifyCommunityStorageChange();
}

export function isDashboardCardDismissed(): boolean {
  return readStorage(KEYS.dashboardCardDismissed) === '1';
}

export function dismissDashboardCard(): void {
  writeStorage(KEYS.dashboardCardDismissed, '1');
  notifyCommunityStorageChange();
}

/** Per-session: avoid repeating the same inline CTA placement */
export function hasShownPlacement(placement: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(KEYS.placementShown);
    const set = raw ? (JSON.parse(raw) as string[]) : [];
    return set.includes(placement);
  } catch {
    return false;
  }
}

export function markPlacementShown(placement: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(KEYS.placementShown);
    const set = raw ? (JSON.parse(raw) as string[]) : [];
    if (!set.includes(placement)) {
      sessionStorage.setItem(KEYS.placementShown, JSON.stringify([...set, placement]));
    }
  } catch {
    /* ignore */
  }
}

export function shouldShowBanner(): boolean {
  if (hasJoinedCommunity()) return false;
  return !isBannerDismissed();
}

export function shouldShowWidget(): boolean {
  if (hasJoinedCommunity()) return false;
  return !isWidgetDismissed();
}

export function shouldShowDashboardCard(): boolean {
  if (hasJoinedCommunity()) return false;
  return !isDashboardCardDismissed();
}

export function shouldShowInlineCta(placement: string): boolean {
  if (hasJoinedCommunity()) return false;
  return !hasShownPlacement(placement);
}
