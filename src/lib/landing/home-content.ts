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
  title: 'From random answers → structured answers panels can score',
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

/** Placeholder strip — replace with aggregated, opt-in learner stats post-launch. */
export const RESULTS_PROOF = {
  title: 'Private beta · resume-aware scored practice',
  subtitle:
    'We are validating the product with early users — no fabricated placement or shortlist stories.',
  stories: [] as const,
} as const;

export const RESUME_WOW = {
  title: 'Your interviewer starts with your resume',
  subtitle: 'Four beats — from file to score. This pipeline is the product.',
  topics: ['Payment APIs', 'React + TS', 'Team of 4', 'SQL / perf'] as const,
  questions: [
    'Trace the payment retry failure you owned in production.',
    'Who owned the ambiguous checkout bug — you or frontend?',
  ] as const,
} as const;

export const PRESSURE_MISTAKES = {
  title: 'Three mistakes that hurt interview scores under pressure',
  kicker: 'Easy to overlook until feedback shows the pattern.',
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

/** Not used on the homepage UI — landing uses an explicit beta block instead of quotes. */
export const TESTIMONIALS = [] as const;

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
    title: 'Your resume drives the session',
    body: 'Your interviewer starts with your resume — so every mock probes the work you actually wrote.',
    icon: 'file' as const,
  },
  {
    title: 'Follow-ups that feel real',
    body: 'Weak or vague answers trigger follow-up questions, just like a real interviewer.',
    icon: 'layout' as const,
  },
  {
    title: 'Scores you can act on',
    body: 'Know exactly why an answer scored well — and what to improve before your next interview.',
    icon: 'chart' as const,
  },
] as const;

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Upload Resume',
    description: 'Your interviewer starts with your resume — practice should too.',
    icon: 'upload' as const,
  },
  {
    step: 2,
    title: 'Take Voice Interview',
    description: 'Answer out loud under realistic pacing — the way a panel hears you.',
    icon: 'mic' as const,
  },
  {
    step: 3,
    title: 'Handle Follow-ups',
    description: 'Vague answers trigger follow-ups, just like a real interviewer.',
    icon: 'probe' as const,
  },
  {
    step: 4,
    title: 'Get Structured Feedback',
    description: 'Know why you scored well — and what to fix before the next round.',
    icon: 'trend' as const,
  },
] as const;

export const FEATURE_PILLARS = [
  {
    id: 'intelligence',
    title: 'Intelligence',
    subtitle: 'Practice built from your CV',
    icon: 'brain' as const,
    bullets: ['Your resume shapes the question plan', 'Built for Indian campus hiring'],
  },
  {
    id: 'structure',
    title: 'Structure',
    subtitle: 'Frameworks that hold under pressure',
    icon: 'framework' as const,
    bullets: ['STAR expectations on every prompt', 'Same answer feedback — no mood scoring'],
  },
  {
    id: 'outcomes',
    title: 'Practice loop',
    subtitle: 'Measure progress between sessions',
    icon: 'target' as const,
    bullets: ['Scores that show what to fix next', 'Walk in clearer than last week'],
  },
] as const;

/** Illustrative scores for landing visual only */
export const SCORING_VISUAL = [
  { key: 'communication_clarity', label: 'Communication Clarity', value: 7.4 },
  { key: 'content_accuracy', label: 'Content Accuracy', value: 7.6 },
  { key: 'answer_structure', label: 'Answer Structure', value: 8.3 },
  { key: 'specificity', label: 'Specificity', value: 7.4 },
  { key: 'relevance', label: 'Relevance', value: 7.5 },
] as const;

export const EVALUATION_DIMENSIONS = [
  { name: 'Communication Clarity', weight: '20%', detail: 'Concise, professional wording' },
  { name: 'Content Accuracy', weight: '25%', detail: 'Accuracy and terminology' },
  { name: 'Answer Structure', weight: '20%', detail: 'STAR-style flow' },
  { name: 'Specificity', weight: '15%', detail: 'Concrete examples and detail' },
  { name: 'Relevance', weight: '20%', detail: 'Stays on the question' },
] as const;

/** High-impact positioning: ChatGPT / generic vs InterviewEra (replaces neutral feature table) */
export const POSITIONING_MICRO_KICKER =
  'Many candidates already use ChatGPT — but still struggle in live interviews';

export const POSITIONING_HEADLINE = "Why ChatGPT practice isn't enough for placements";

export const POSITIONING_SUBLINES = [
  'Generating answers ≠ clearing interviews',
  'Without structure and scoring, you’re guessing — not improving',
] as const;

/** Qualitative bridge under the ChatGPT objection — no numeric claims. */
export const POSITIONING_BRIDGE =
  'Candidates who practice with structure and scoring walk in clearer on what to fix than after freeform ChatGPT sessions.';

export const POSITIONING_LEFT = {
  label: 'ChatGPT & generic tools',
  tone: 'Helpful, but not designed for placements',
  items: [
    'No structured interview flow',
    'No scoring system',
    'No resume-based question sequencing',
    'No Mock Interview flow',
  ] as const,
} as const;

export const POSITIONING_RIGHT = {
  label: 'InterviewEra',
  tone: 'Built for structured placement-style practice',
  items: [
    'Resume-aware questions from your CV',
    'Adaptive Follow-up Questions when answers go vague',
    'Answer Feedback you can act on',
    'Full Mock Interview flow',
  ] as const,
} as const;

export const POSITIONING_WHY_MATTERS = {
  title: 'Why this difference actually matters',
  points: [
    {
      title: 'Without scoring → you don’t know if you improved',
      body: 'Numbers force iteration before the real interview.',
    },
    {
      title: 'Without structure → answers stay random',
      body: 'Chat has no scoreboard; it doesn’t train STAR under pressure.',
    },
    {
      title: 'Without simulation → real panels feel alien',
      body: 'One-off prompts ≠ a timed multi-question Mock Interview.',
    },
  ] as const,
} as const;

export const PRICING_FAQ = [
  {
    q: 'What is a credit?',
    a: 'One credit starts one mock interview session. Paid Starter and Pro plans include credits for each 30-day access period; Free includes 3 lifetime credits.',
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
    a: 'ChatGPT won’t run a scored, multi-question session with the same answer feedback model every time. InterviewEra is built as a practice system, not a chat.',
  },
] as const;
