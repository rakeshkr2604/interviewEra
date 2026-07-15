'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { COMMUNITY_HUB_PATH } from '@/lib/community/community';

const CommunityWidgetUnavailable = () => null;

function loadCommunityWidget() {
  return import('@/components/community/CommunityWidget')
    .then((m) => m.CommunityWidget)
    .catch((error: unknown) => {
      const isChunkError =
        error instanceof Error &&
        (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk'));
      if (process.env.NODE_ENV === 'development' && isChunkError) {
        console.warn(
          '[CommunityWidget] Dev chunk is stale. Hard-refresh (Ctrl+Shift+R) or restart `npm run dev` after clearing `.next`.',
        );
      }
      return CommunityWidgetUnavailable;
    });
}

const CommunityWidget = dynamic(loadCommunityWidget, { ssr: false });

const SUPPRESS_PREFIXES = [
  '/admin',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/interview/session',
  '/interview/script',
  '/onboarding',
  '/upgrade',
  COMMUNITY_HUB_PATH,
] as const;

function useIdleReady(delayMs = 2500): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const activate = () => {
      if (!cancelled) setReady(true);
    };

    type IdleWin = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWin;

    const onInteraction = () => {
      activate();
      window.removeEventListener('scroll', onInteraction, { capture: true });
      window.removeEventListener('pointerdown', onInteraction, { capture: true });
    };

    window.addEventListener('scroll', onInteraction, { capture: true, passive: true });
    window.addEventListener('pointerdown', onInteraction, { capture: true });

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (w.requestIdleCallback) {
      idleId = w.requestIdleCallback(activate, { timeout: delayMs });
    } else {
      timeoutId = setTimeout(activate, delayMs);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('scroll', onInteraction, { capture: true });
      window.removeEventListener('pointerdown', onInteraction, { capture: true });
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [delayMs]);

  return ready;
}

/**
 * Global floating community widget — lazy-loaded after idle/interaction.
 * Suppressed on auth, interviews, onboarding, payments-adjacent flows, and /community.
 */
export function CommunityGlobalSlot() {
  const pathname = usePathname() ?? '';
  const ready = useIdleReady();

  const suppressed = SUPPRESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (suppressed || !ready) return null;
  return <CommunityWidget />;
}
