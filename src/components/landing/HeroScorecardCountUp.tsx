'use client';

import { CountUp } from '@/components/landing/landing-home-shared';

type HeroScorecardCountUpProps = {
  readonly to: number;
  readonly decimals?: number;
  readonly duration?: number;
  readonly delay?: number;
};

/** Client boundary for animated score in hero card (parent is RSC). */
export function HeroScorecardCountUp({ to, decimals = 0, duration = 1.0, delay = 0 }: HeroScorecardCountUpProps) {
  return <CountUp to={to} decimals={decimals} duration={duration} delay={delay} />;
}
