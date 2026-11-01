/** Homepage timeline section — copy + stage config (approved Claude design). */

import { FREE_PLAN } from '@/lib/pricing/plans';

export const TIMELINE_INTRO = {
  eyebrow: 'HOW IT WORKS · FIVE STEPS',
  headline: 'The interview, before',
  headlineEmphasis: 'the interview.',
  body: 'From resume to report: prepare with the free tools, then practise a mock interview that builds every question from you. Shown with a representative sample session.',
} as const;

export const TIMELINE_INTERVIEWER = {
  name: 'Meera',
  role: 'AI Interviewer',
  videoSrc: '/avatars/female/meera-ai.mp4',
  posterSrc: '/assets/meera-intro-poster.webp',
  /** Static placeholder when video is off — keep tiny (not the 1.5MB PNG source). */
  avatarSrc: '/assets/meera-intro-poster.webp',
} as const;

export const TIMELINE_SPINE_LABELS = [
  'Resume',
  'Questions',
  'Practise',
  'Evaluation',
  'Improve',
] as const;

export type TimelineStageIndex = 1 | 2 | 3 | 4 | 5;

export type TimelineStageCopy = {
  index: TimelineStageIndex;
  kicker: string;
  title: string;
  body: string;
};

export const TIMELINE_STAGE_COPY: readonly TimelineStageCopy[] = [
  {
    index: 1,
    kicker: '01 · ANALYSE YOUR RESUME',
    title: 'It studies you first.',
    body: 'Check how your resume reads with the free ATS Resume Checker. In a mock interview, your interviewer reads the same resume for projects, claims and the one line worth probing.',
  },
  {
    index: 2,
    kicker: '02 · PREPARE RELEVANT QUESTIONS',
    title: 'Questions built for your role.',
    body: 'Rehearse role questions with the free Question Generator and STAR Answer Builder. In the interview, questions come from your resume — you answer out loud while it transcribes.',
  },
  {
    index: 3,
    kicker: '03 · PRACTISE WITH AN AI INTERVIEWER',
    title: 'It notices what you avoided.',
    body: 'The adaptive follow-up is built from your own answer — then Meera waits, the way a real interviewer does. One credit starts one session.',
  },
  {
    index: 4,
    kicker: '04 · RECEIVE STRUCTURED EVALUATION',
    title: 'The truth, kindly.',
    body: 'Five dimensions against a rubric — every score with the reason behind it and the exact next step.',
  },
  {
    index: 5,
    kicker: '05 · IMPROVE AND REPEAT',
    title: 'Fix one thing. Run it again.',
    body: `Your report sets the next practice focus, and progress shows across sessions. New accounts get ${FREE_PLAN.credits} free mock-interview credits.`,
  },
] as const;

export const TIMELINE_RESUME = {
  fileName: 'Rahul_Sharma_Resume.pdf',
  fileMeta: '1 page · uploaded just now',
  parseTime: 'parsed · 2.8s',
  fields: [
    { label: 'EDUCATION', value: 'B.Tech CS · 2026' },
    { label: 'TARGET ROLE', value: 'Frontend Dev Intern' },
    { label: 'PRACTICE', value: '350+ DSA problems' },
  ],
  tags: [
    'Strong React fundamentals',
    '3 academic projects',
    'REST APIs + basic auth',
    'Frontend intern · ABC Technologies',
  ],
  probeTag: 'Realtime chat app — worth probing',
} as const;

export const TIMELINE_QUESTION = {
  prompt:
    'Walk me through your realtime chat application. What did you build, and what broke along the way?',
  transcriptWords:
    'I built it with React and Socket.io on a Node backend. When users reconnected, messages kept duplicating — so I added message ids with acknowledgements and de-duplicated on the client. After that it stayed stable.'.split(
      ' ',
    ),
} as const;

export const TIMELINE_PRESSURE = {
  badge: 'ADAPTIVE FOLLOW-UP',
  context: 're: "messages kept duplicating" — your answer, 30s ago',
  thinkingLabel: 'Meera is thinking about your answer…',
  followUpParts: [
    { text: 'You said messages ', highlight: false },
    { text: 'duplicated on reconnect', highlight: true },
    { text: ' — how does your fix behave ', highlight: false },
    { text: 'with two tabs ', highlight: false },
    { text: 'open?', highlight: false },
  ],
  aside: 'Take a breath. Meera waits while you think.',
} as const;

export const TIMELINE_INSIGHT = {
  label: 'THIS QUESTION · SCORE-V1.2',
  targetScore: 7.6,
  dimensions: [
    { label: 'Communication Clarity', value: 7.0, width: 70 },
    { label: 'Content Accuracy', value: 7.0, width: 70 },
    { label: 'Answer Structure', value: 7.0, width: 70 },
    { label: 'Specificity', value: 7.0, width: 70 },
    { label: 'Relevance', value: 10, width: 100, accent: 'success' as const },
  ],
  nextStep:
    'add the result — how often messages duplicated before your fix, and after. Numbers make the story land.',
} as const;

export const TIMELINE_READY = {
  headline: 'Walk in having already answered',
  headlineEmphasis: 'the hard one.',
  body: `New accounts get ${FREE_PLAN.credits} lifetime mock-interview credits. No credit card — create a free account and start your first session.`,
  cta: 'Create your free account',
  footnote: `${FREE_PLAN.credits} FREE CREDITS · NO CARD · ENGLISH + HINDI`,
} as const;

export const TIMELINE_CONTEXT_BY_STAGE = [
  'PRE-INTERVIEW · RESUME ANALYSIS',
  'HR INTERVIEW · FRONTEND DEV INTERN · ENGLISH · MIC ON',
  'HR INTERVIEW · ADAPTIVE FOLLOW-UP · MEDIUM',
  'INTERVIEW COMPLETE · AI EVALUATION',
  'SESSION COMPLETE · REPORT READY',
] as const;
