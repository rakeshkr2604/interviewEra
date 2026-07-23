export type MeetInterviewer = {
  id: 'rohan' | 'meera';
  name: string;
  roleLine: string;
  badge: string;
  videoSrc: string;
  posterSrc: string;
};

/**
 * Marketing-only persona intros (Phase 4a).
 * Mapping: Rohan = Technical (live `arjun`), Meera = HR (live `priya`).
 * Live session display names are also Rohan/Meera; internal ids remain priya/arjun.
 */
export const MEET_INTERVIEWERS: MeetInterviewer[] = [
  {
    id: 'rohan',
    name: 'Rohan',
    roleLine: 'Technical deep-dives',
    badge: 'TECH PRACTICE',
    videoSrc: '/assets/rohan-intro.mp4',
    posterSrc: '/assets/rohan-intro-poster.webp',
  },
  {
    id: 'meera',
    name: 'Meera',
    roleLine: 'HR & behavioral rounds',
    badge: 'HR PRACTICE',
    videoSrc: '/assets/meera-intro.mp4',
    posterSrc: '/assets/meera-intro-poster.webp',
  },
];
