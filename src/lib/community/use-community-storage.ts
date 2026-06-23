'use client';

import { useSyncExternalStore } from 'react';
import { COMMUNITY_STORAGE_EVENT } from '@/lib/community/storage-events';

export function subscribeCommunityStorage(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith('ie-community')) onStoreChange();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(COMMUNITY_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(COMMUNITY_STORAGE_EVENT, onStoreChange);
  };
}

export function useCommunityStorageSnapshot<T>(
  getClientSnapshot: () => T,
  getServerSnapshot: () => T,
): T {
  return useSyncExternalStore(
    subscribeCommunityStorage,
    getClientSnapshot,
    getServerSnapshot,
  );
}

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
}
