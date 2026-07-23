export type MeetInterviewer = {
  id: 'rohan' | 'meera';
  name: string;
  roleLine: string;
  /** Spoken TTS line muxed into the intro video (also shown as caption). */
  spokenLine: string;
  badge: string;
  videoSrc: string;
  posterSrc: string;
};

/**
 * Marketing-only persona intros (Phase 4a + 6d TTS).
 * Mapping: Rohan = Technical (live `arjun`), Meera = HR (live `priya`).
 * Spoken lines match script/start voice preview copy.
 */
export const MEET_INTERVIEWERS: MeetInterviewer[] = [
  {
    id: 'rohan',
    name: 'Rohan',
    roleLine: 'Technical deep-dives',
    spokenLine: "Hello! I'm Rohan, your technical interviewer. Let's dive into your experience.",
    badge: 'TECH PRACTICE',
    videoSrc: '/assets/rohan-intro.mp4',
    posterSrc: '/assets/rohan-intro-poster.webp',
  },
  {
    id: 'meera',
    name: 'Meera',
    roleLine: 'HR & behavioral rounds',
    spokenLine: "Hi! I'm Meera, your AI interviewer. I'll guide you through this session.",
    badge: 'HR PRACTICE',
    videoSrc: '/assets/meera-intro.mp4',
    posterSrc: '/assets/meera-intro-poster.webp',
  },
];
