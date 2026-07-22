'use client';

import dynamic from 'next/dynamic';
import { LandingHeroSimulatorShell } from '@/components/landing/LandingHeroSimulatorShell';

/**
 * Client island: code-splits the turn-engine + video while SSR/first paint
 * can still show the static poster shell (no spinner, reserved layout).
 */
const LandingHeroSimulator = dynamic(
  () => import('@/components/landing/LandingHeroSimulator'),
  { loading: () => <LandingHeroSimulatorShell /> },
);

export default function LandingHeroSimulatorIsland() {
  return <LandingHeroSimulator />;
}
