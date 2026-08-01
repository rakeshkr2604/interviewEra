/**
 * Landing interview report — illustrative sample demo data.
 * Coaching-first preview aligned with in-product answer feedback dimensions.
 */

export const SCORING_ENGINE_SECTION = {
  eyebrow: 'YOUR INTERVIEW REPORT',
  heading: "See the Interview Report you'll receive after every Mock Interview.",
  subheading:
    'Strengths, gaps, dimension scores, and a clear next step — pulled from Answer Feedback across the session.',
} as const;

export const REPORT_DEMO = {
  session: {
    title: 'Interview Complete',
    roleLine: 'Backend Developer • Round 2',
    stats: [
      { kind: 'duration', label: '18 min' },
      { kind: 'questions', label: '12 Questions' },
      { kind: 'followups', label: '8 Follow-up Questions' },
    ],
  },
  overallOutcome: {
    statusLabel: 'Status',
    label: 'Almost Ready',
    scoreLabel: 'Overall Score',
    score: 7.6,
  },
  labels: {
    overallFeedback: 'Overall Interview Feedback',
    biggestImprovement: 'Biggest Improvement',
    why: 'Why?',
    whyThisScore: 'Why this score',
    strengths: 'What You Did Well',
    areasToImprove: 'Areas to Improve',
    performanceBreakdown: 'Performance Breakdown',
  },
  highestImpactImprovement: {
    dimension: 'Communication Clarity',
    tip: 'Explain architectural decisions more confidently.',
    whyLines: [
      'Most answers were technically correct.',
      'Follow-up explanations became less structured.',
    ],
    nextStep:
      'End each answer with a clear conclusion before moving to the next question.',
    whyScoreNote:
      'Follow-up answers became less structured, making explanations harder to follow.',
  },
  strengths: [
    'Explained projects clearly',
    'Strong backend fundamentals',
    'Relevant project examples',
  ],
  nextImprovements: [
    'Explain trade-offs',
    'Reduce filler words',
    'Finish with concise summaries',
  ],
  overallFeedback: {
    paragraphs: [
      'Strong backend fundamentals.',
      'Relevant project selection.',
      'Most technical answers were correct.',
      'Follow-up explanations lacked depth.',
      'Improve communication clarity and answer structure next.',
    ],
  },
  evaluationDimensions: [
    {
      name: 'Communication Clarity',
      val: 7.4,
      pct: 74,
      hint: 'Speak slightly slower during explanations',
    },
    {
      name: 'Content Accuracy',
      val: 7.6,
      pct: 76,
      hint: 'Strong backend concepts',
    },
    {
      name: 'Answer Structure',
      val: 8.3,
      pct: 83,
      hint: 'STAR format used well',
    },
    {
      name: 'Specificity',
      val: 7.4,
      pct: 74,
      hint: 'Add more concrete examples',
    },
    {
      name: 'Relevance',
      val: 7.5,
      pct: 75,
      hint: 'Stayed on the question',
    },
  ],
  cta: {
    heading: 'Generate your own Interview Report',
    subheading: 'You’ll receive an Interview Report like this after every Mock Interview.',
    primaryText: 'Start Free Mock Interview',
    primaryHref: '/signup',
    trustItems: ['Free', 'Resume-aware', 'No credit card'],
  },
} as const;
