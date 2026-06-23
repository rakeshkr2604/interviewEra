export const COMMUNITY_STORAGE_EVENT = 'ie-community-storage';

export function notifyCommunityStorageChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COMMUNITY_STORAGE_EVENT));
}
