'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';
import { LandingHeroSimulatorShell } from '@/components/landing/LandingHeroSimulatorShell';

/**
 * Tiny client boundary: SSR/first paint keep the static shell; the turn-engine
 * chunk loads only after desktop idle or an explicit mobile gesture.
 */
const LandingHeroSimulator = dynamic(
  () => import('@/components/landing/LandingHeroSimulator'),
  { loading: () => <LandingHeroSimulatorShell /> },
);

function prefersDeferredSimulator(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(max-width: 768px), (hover: none) and (pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export function LandingHeroSimulatorGestureLoader({ fallback }: { fallback: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!prefersDeferredSimulator()) {
      const id = globalThis.requestAnimationFrame(() => setReady(true));
      return () => globalThis.cancelAnimationFrame(id);
    }

    const host = document.querySelector('.hero-mockup-col');
    const activate = () => setReady(true);
    host?.addEventListener('pointerdown', activate, { passive: true, once: true });
    host?.addEventListener('focusin', activate, { once: true });
    return () => {
      host?.removeEventListener('pointerdown', activate);
      host?.removeEventListener('focusin', activate);
    };
  }, []);

  if (!ready) return <>{fallback}</>;
  return <LandingHeroSimulator />;
}
