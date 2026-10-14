import { LandingHeroSimulatorGestureLoader } from '@/components/landing/LandingHeroSimulatorGestureLoader';
import { LandingHeroSimulatorShell } from '@/components/landing/LandingHeroSimulatorShell';

/**
 * Server island: static poster shell is in the RSC payload; only the gesture
 * loader hydrates. Keeps the turn-engine + video off the mobile LCP graph.
 */
export default function LandingHeroSimulatorIsland() {
  return (
    <LandingHeroSimulatorGestureLoader fallback={<LandingHeroSimulatorShell />} />
  );
}
