/** Homepage & marketing copy — placement-outcome framing, single source for landing */

/** Bad answer split for red “vague / no structure” highlights */
export const TRANSFORMATION_BAD_SEGMENTS = [
  { text: 'Yeah so basically in my project we had some issues and I worked with my team. ', flaw: 'vague' as const },
  { text: 'We used different things and I did my best. ', flaw: 'vague' as const },
  { text: 'It was tough but we managed to finish it. ', flaw: 'structure' as const },
  {
    text: "I learned a lot from the experience and I'm a quick learner so I can adapt.",
    flaw: 'vague' as const,
  },
] as const;

export const TRANSFORMATION = {
  title: 'From random answers → structured answers that get shortlisted',
  subtitle:
    'Same question. Two ways to answer. Spot the difference in two seconds — vague vs. evidence-backed.',
  question: 'Tell me about a time you solved a hard technical problem under a deadline.',
  badAnswer: `Yeah so basically in my project we had some issues and I worked with my team. We used different things and I did my best. It was tough but we managed to finish it. I learned a lot from the experience and I'm a quick learner so I can adapt.`,
  goodAnswer: {
    situation:
      'Final-year project: payment API failing intermittently two days before submission — team of four, professor demo locked.',
    task: 'I owned backend debugging and had to stabilise retries without breaking existing checkout flow.',
    action:
      'Reproduced with logging, traced race in retry worker, added idempotent keys + backoff; paired with frontend for error UX.',
    result: 'Zero failed demos; submission on time; professor used it as the class example for error handling.',
  },
  highlights: ['Ownership clear', 'Metric in the result'],
  goodMarks: [
    { label: 'STAR format', ok: true as const },
    { label: 'Clear impact', ok: true as const },
  ] as const,
} as const;

export const RESULTS_PROOF = {
  title: 'Students are improving before they sit for real interviews',
  subtitle: 'Semi-anonymous profiles — same kinds of outcomes we see after scored mocks.',
  stories: [
    {
      name: 'Ayush',
      college: 'B.Tech CSE · Tier-3 college',
      outcome: 'Improved from 4.6 → 7.4 in 3 sessions',
    },
    {
      name: 'Priya S.',
      college: 'DU · B.Com (Hons)',
      outcome: 'Shortlisted at 2 companies after practice',
    },
    {
      name: 'Arjun K.',
      college: 'Private engg · ECE',
      outcome: 'Structure 4.2 → 7.1 before core drives',
    },
  ] as const,
} as const;

export const RESUME_WOW = {
  title: 'Your resume becomes your interview',
  subtitle: 'Four beats — from file to score. This pipeline is the product.',
  topics: ['Payment APIs', 'React + TS', 'Team of 4', 'SQL / perf'] as const,
  questions: [
    'Trace the payment retry failure you owned in production.',
    'Who owned the ambiguous checkout bug — you or frontend?',
  ] as const,
} as const;

export const PRESSURE_MISTAKES = {
  title: 'Three mistakes that silently kill your shortlist chances',
  kicker: 'You don’t even realise you’re making them — until the rejection mail lands.',
  items: [
    {
      title: 'No structure',
      body: 'Panels can’t score ramble — you look unsure even when you know the work.',
    },
    {
      title: 'Generic answers',
      body: 'If it fits any CV, it doesn’t prove you.',
    },
    {
      title: 'No feedback loop',
      body: 'Same weak answers × 10 companies — no numbers, no fix.',
    },
  ],
} as const;

export const TESTIMONIALS = [
  {
    name: 'Ananya K.',
    college: 'NIT Trichy · CSE',
    result: 'Shortlisted at 3 product companies',
    quote: 'Random stories → STAR. Feedback matched what seniors said panels actually score.',
  },
  {
    name: 'Rahul M.',
    college: 'VIT · ECE',
    result: 'First offer after 12 scored sessions',
    quote: 'Questions were from my resume — I knew what to fix before each process.',
  },
] as const;

export const PROBLEM_POINTS = [
  {
    title: 'No structured prep',
    body: 'You read notes but never simulate time pressure or follow-up probes.',
    icon: 'layers' as const,
  },
  {
    title: 'Random question lists',
    body: 'Generic banks ignore your projects — you rehearse the wrong stories.',
    icon: 'shuffle' as const,
  },
  {
    title: 'Zero honest feedback',
    body: 'Friends say “you did fine” — you don’t know what actually cost you the round.',
    icon: 'message' as const,
  },
] as const;

export const SOLUTION_POINTS = [
  {
    title: 'Resume-native questions',
    body: 'Parsed once — every mock pulls skills, projects, and role context you actually wrote.',
    icon: 'file' as const,
  },
  {
    title: 'STAR-ready flow',
    body: 'Nudges and rubrics aligned to how Indian campus and tech panels evaluate answers.',
    icon: 'layout' as const,
  },
  {
    title: 'AI scores + next steps',
    body: 'Five weighted dimensions with clear gaps so each session increases placement odds.',
    icon: 'chart' as const,
  },
] as const;

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Upload resume',
    description: 'One parse · under a minute. Questions pull from what you wrote.',
    icon: 'upload' as const,
  },
  {
    step: 2,
    title: 'Answer AI questions',
    description: 'Multi-question flow — tech, behavioural, pressure.',
    icon: 'mic' as const,
  },
  {
    step: 3,
    title: 'Get scored & improve',
    description: 'Five dimensions · see gaps before the next company.',
    icon: 'trend' as const,
  },
] as const;

export const FEATURE_PILLARS = [
  {
    id: 'intelligence',
    title: 'Intelligence',
    subtitle: 'AI that reads your CV',
    icon: 'brain' as const,
    bullets: ['Resume-native questions & follow-ups', 'Built for Indian campus hiring'],
  },
  {
    id: 'structure',
    title: 'Structure',
    subtitle: 'Frameworks that convert',
    icon: 'framework' as const,
    bullets: ['STAR expectations every prompt', 'Same rubric — no mood scoring'],
  },
  {
    id: 'outcomes',
    title: 'Outcomes',
    subtitle: 'Raise placement probability',
    icon: 'target' as const,
    bullets: ['Progress across sessions', 'Know what to fix before D-Day'],
  },
] as const;

/** Illustrative scores for landing visual only */
export const SCORING_VISUAL = [
  { key: 'communication', label: 'Communication', value: 7.4 },
  { key: 'technical', label: 'Technical depth', value: 6.9 },
  { key: 'structure', label: 'Answer structure', value: 7.8 },
  { key: 'confidence', label: 'Confidence', value: 6.5 },
  { key: 'relevance', label: 'Relevance', value: 7.6 },
] as const;

export const EVALUATION_DIMENSIONS = [
  { name: 'Communication clarity', weight: '20%', detail: 'Concise, professional wording' },
  { name: 'Technical depth', weight: '25%', detail: 'Accuracy and terminology' },
  { name: 'Answer structure', weight: '20%', detail: 'STAR-style flow' },
  { name: 'Confidence', weight: '15%', detail: 'Direct, low-hedging answers' },
  { name: 'Relevance', weight: '20%', detail: 'Stays on the question' },
] as const;

/** High-impact positioning: ChatGPT / generic vs InterviewEra (replaces neutral feature table) */
export const POSITIONING_MICRO_KICKER =
  'Most students already use ChatGPT — but still struggle in interviews';

export const POSITIONING_HEADLINE = "Why ChatGPT practice isn't enough for placements";

export const POSITIONING_SUBLINES = [
  'Generating answers ≠ clearing interviews',
  'Without structure and scoring, you’re guessing — not improving',
] as const;

export const POSITIONING_STAT = {
  stat: '~2×',
  rest: 'higher session scores on average',
  hint: 'Illustrative uplift for students who switch from chat-only prep to structured scored mocks — individual results vary.',
} as const;

export const POSITIONING_LEFT = {
  label: 'ChatGPT & generic tools',
  tone: 'Helpful, but not designed for placements',
  items: [
    'No structured interview flow',
    'No scoring system',
    'No resume-based question sequencing',
    'No real interview simulation',
  ] as const,
} as const;

export const POSITIONING_RIGHT = {
  label: 'InterviewEra',
  tone: 'Built for real placement outcomes',
  items: [
    'Resume-personalized sessions',
    'Structured scoring (5 dimensions)',
    'Multi-question simulation',
    'Panel-style progression',
  ] as const,
} as const;

export const POSITIONING_WHY_MATTERS = {
  title: 'Why this difference actually matters',
  points: [
    {
      title: 'Without scoring → you don’t know if you improved',
      body: 'Numbers force iteration before D-Day.',
    },
    {
      title: 'Without structure → answers stay random',
      body: 'Chat feels smart; it doesn’t train STAR under pressure.',
    },
    {
      title: 'Without simulation → real panels feel alien',
      body: 'One-off prompts ≠ a timed multi-Q session.',
    },
  ] as const,
} as const;

export const PRICING_FAQ = [
  {
    q: 'What is a credit?',
    a: 'One credit starts one mock interview session. Credits reset monthly on Starter and Pro; Free includes 5 lifetime credits.',
  },
  {
    q: 'Do I need a card for the free tier?',
    a: 'No. Sign up, upload your resume, and use your free credits without adding a payment method.',
  },
  {
    q: 'Is this only for software roles?',
    a: 'No — questions adapt to your resume and target role, including core, consulting-style, and HR-heavy tracks.',
  },
  {
    q: 'How is this different from asking ChatGPT?',
    a: 'ChatGPT won’t run a scored, multi-question session with a fixed rubric and history. InterviewEra is built as a practice system, not a chat.',
  },
] as const;
