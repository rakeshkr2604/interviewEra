'use client';

import { useEffect } from 'react';

const MANIFEST_PATH = '/site.webmanifest';

/**
 * Injects `<link rel="manifest">` after idle so the manifest fetch does not sit
 * on Lighthouse’s HTML critical path vs eager `metadata.manifest` in layout.
 */
export function DeferredWebManifest() {
  useEffect(() => {
    const existing = document.querySelector<HTMLLinkElement>(`link[rel="manifest"][href="${MANIFEST_PATH}"]`);
    if (existing) return;

    type IdleWin = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const w = window as IdleWin;

    const inject = () => {
      if (document.querySelector(`link[rel="manifest"][href="${MANIFEST_PATH}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = MANIFEST_PATH;
      link.setAttribute('fetchpriority', 'low');
      document.head.appendChild(link);
    };

    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(inject, { timeout: 3000 });
      return () => {
        const cw = window as Window & { cancelIdleCallback?: (handle: number) => void };
        cw.cancelIdleCallback?.(id);
      };
    }
    const tid = window.setTimeout(inject, 1);
    return () => window.clearTimeout(tid);
  }, []);

  return null;
}
