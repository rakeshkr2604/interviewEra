import type { BadgeKey } from './constants'

export const BADGE_DISPLAY: Record<
  BadgeKey,
  { title: string; shortDescription: string }
> = {
  consistent_learner: {
    title: 'Consistent learner',
    shortDescription: 'Hit a multi-day practice rhythm',
  },
  dedicated_preparer: {
    title: 'Dedicated preparer',
    shortDescription: 'Keep showing up across the placement grind',
  },
  interview_ready: {
    title: 'Interview-ready',
    shortDescription: 'Long-run consistency that recruiters notice',
  },
  placement_warrior: {
    title: 'Placement warrior',
    shortDescription: 'Elite persistence through peak season',
  },
}
