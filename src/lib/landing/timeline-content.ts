/** Homepage timeline section — copy + stage config (approved Claude design). */

export const TIMELINE_INTRO = {
  eyebrow: 'ONE SESSION · ONE INTERVIEWER · SCROLL',
  headline: 'The interview, before',
  headlineEmphasis: 'the interview.',
  body: 'One real InterviewEra session, start to finish. Nothing scripted for the demo — it builds every question from you.',
} as const;

export const TIMELINE_INTERVIEWER = {
  name: 'Meera',
  role: 'AI Interviewer',
  videoSrc: '/assets/meera-intro.mp4',
  posterSrc: '/assets/meera-intro-poster.webp',
  avatarSrc: '/avatars/female/meera-avatar.png',
} as const;

export const TIMELINE_SPINE_LABELS = [
  'Resume',
  'Question',
  'Pressure',
  'Insight',
  'Ready',
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
    kicker: '01 · RESUME',
    title: 'It studies you first.',
    body: 'Projects, claims, and the one line worth probing — read the way a senior interviewer would.',
  },
  {
    index: 2,
    kicker: '02 · QUESTION',
    title: 'Then it asks. Out loud.',
    body: 'You speak — it listens and transcribes in real time. No typing, no multiple choice.',
  },
  {
    index: 3,
    kicker: '03 · PRESSURE',
    title: 'It notices what you avoided.',
    body: 'The follow-up is built from your own answer — then Meera waits, the way a real interviewer does.',
  },
  {
    index: 4,
    kicker: '04 · INSIGHT',
    title: 'The truth, kindly.',
    body: 'Five dimensions against a rubric — every score with the reason behind it and the exact next step.',
  },
  {
    index: 5,
    kicker: '05 · READY',
    title: 'Walk in ready.',
    body: 'Three free interviews. No card. Meera is ready when you are.',
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
  body: 'Your first 3 AI mock interviews are completely free. No credit card — you’ll be in a live session in under two minutes.',
  cta: 'Start your first interview',
  footnote: '3 FREE INTERVIEWS · NO CARD · ENGLISH + HINDI',
} as const;

export const TIMELINE_CONTEXT_BY_STAGE = [
  'PRE-INTERVIEW · RESUME ANALYSIS',
  'HR INTERVIEW · FRONTEND DEV INTERN · ENGLISH · MIC ON',
  'HR INTERVIEW · ADAPTIVE FOLLOW-UP · MEDIUM',
  'INTERVIEW COMPLETE · AI EVALUATION',
  'SESSION COMPLETE · REPORT READY',
] as const;

export const TIMELINE_LIVE_BY_STAGE = ['PREP', 'LIVE', 'LIVE', 'EVAL', 'DONE'] as const;
