export type MeetInterviewer = {
  id: 'rohan' | 'meera';
  name: string;
  interviewType: string;
  description: string;
  practiceLabel: string;
  topics: readonly string[];
  badge: string;
  videoSrc: string;
  posterSrc: string;
};

/**
 * Marketing round-type cards (Phase 4a).
 * Mapping: Rohan = Technical (live `arjun`), Meera = HR (live `priya`).
 * Live session display names are also Rohan/Meera; internal ids remain priya/arjun.
 * Videos are muted-only (Phase 6f — TTS/unmute feature removed).
 */
export const MEET_INTERVIEWERS: MeetInterviewer[] = [
  {
    id: 'rohan',
    name: 'Rohan',
    interviewType: 'Technical Mock Interview',
    description: 'Practice technical discussions the way real interviewers conduct them.',
    practiceLabel: "What you'll practice",
    topics: [
      'Project Discussion',
      'Backend & APIs',
      'React / Frontend',
      'Database Design',
      'System Design Basics',
      'Adaptive Follow-up Questions',
    ],
    badge: 'TECHNICAL',
    videoSrc: '/assets/rohan-intro.mp4',
    posterSrc: '/assets/rohan-intro-poster.webp',
  },
  {
    id: 'meera',
    name: 'Meera',
    interviewType: 'HR Mock Interview',
    description: 'Practice behavioral and communication rounds before the real interview.',
    practiceLabel: "What you'll practice",
    topics: [
      'Tell Me About Yourself',
      'Behavioral Questions',
      'STAR Responses',
      'Resume Discussion',
      'Communication',
      'Situational Questions',
    ],
    badge: 'HR',
    videoSrc: '/assets/meera-intro.mp4',
    posterSrc: '/assets/meera-intro-poster.webp',
  },
];
