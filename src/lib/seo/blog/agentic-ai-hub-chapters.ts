export interface AgenticChapter {
  id: string
  label: string
  readTime: string
  takeaways: readonly string[]
}

/** Navigable chapters — drives sticky TOC, prev/next, and section takeaways. */
export const AGENTIC_CHAPTERS: readonly AgenticChapter[] = [
  {
    id: 'what-is-agentic-ai-interview',
    label: 'What is an Agentic AI Interview?',
    readTime: '4 min',
    takeaways: [
      'Agentic rounds test judgment and verification — not typing speed or memorized syntax.',
      'AI-assisted is not AI-dependent: you orchestrate, review, and own every line.',
      'The format mirrors how product engineers ship with Cursor, Claude, or Copilot today.',
    ],
  },
  {
    id: 'why-companies-adopt',
    label: 'Why Companies Adopt Agentic Rounds',
    readTime: '3 min',
    takeaways: [
      'Hiring loops lag real workflows when they ban the tools engineers use daily.',
      'Coding speed alone no longer separates strong seniors from weak hires.',
      'The backend-bug example shows judgment: validate, test, and fix root cause — do not mask symptoms.',
    ],
  },
  {
    id: 'interview-evolution-timeline',
    label: 'Evolution of Technical Interviews',
    readTime: '2 min',
    takeaways: [
      'Interviews moved from whiteboard → OA → pair programming → LLM-assisted → agentic.',
      'Understanding the timeline explains why your prep must include AI collaboration skills now.',
      'Autonomous engineering interviews are projected next — human oversight remains the signal.',
    ],
  },
  {
    id: 'what-agentic-means',
    label: 'What Does "Agentic" Mean?',
    readTime: '3 min',
    takeaways: [
      'Agents plan multi-step work and use tools; humans retain architecture and merge authority.',
      'Delegation without verification is dependency — not collaboration.',
      'Reject myths: fundamentals still matter; more AI usage is not automatically better.',
    ],
  },
  {
    id: 'how-it-works',
    label: 'How the Interview Works',
    readTime: '3 min',
    takeaways: [
      'You are scored continuously from clarification through discussion — not only the final diff.',
      'Confirm permitted AI tools at the start; policies vary by company.',
      'The macro flow: clarify → plan → collaborate → implement → test → review → discuss.',
    ],
  },
  {
    id: 'skills-evaluated',
    label: 'Skills Being Evaluated',
    readTime: '5 min',
    takeaways: [
      'Fourteen dimensions span clarification, prompting, testing, ownership, and engineering judgment.',
      'Interviewers write scorecard notes on good vs bad signals — study the table before mocks.',
      'Weak prompting and skipped tests are among the fastest ways to fail.',
    ],
  },
  {
    id: 'senior-engineer-mindset',
    label: 'Senior Engineer Mindset',
    readTime: '4 min',
    takeaways: [
      'You are the senior engineer; AI is a fast junior teammate.',
      'Catch wrong indexes, insecure auth, and scope creep — do not accept suggestions blindly.',
      'Under time pressure, ship a tested core and communicate deferred scope explicitly.',
    ],
  },
  {
    id: 'interview-formats',
    label: 'Common Interview Formats',
    readTime: '4 min',
    takeaways: [
      'Formats range from backend APIs and bug fixes to code review and legacy enhancements.',
      'Match AI delegation to format: you own schema and security; AI scaffolds boilerplate.',
      'Light system design may appear at senior levels even in agentic loops.',
    ],
  },
  {
    id: 'sample-60-minute-workflow',
    label: '60-Minute Sample Workflow',
    readTime: '4 min',
    takeaways: [
      'Spend 8–12 minutes clarifying and planning before heavy AI prompting.',
      'Narrate at milestones; silent 30-minute coding gives interviewers no signal.',
      'Reserve the final 10 minutes for demo, tests, and trade-off discussion.',
    ],
  },
  {
    id: 'real-example-simulation',
    label: 'Bad vs Excellent Candidate',
    readTime: '4 min',
    takeaways: [
      'Strong prompts specify stack, constraints, files, and validation rules.',
      'Weak candidates curl once; strong candidates automate edge-case tests.',
      'Outcome difference is ownership and articulation — not whether AI was used.',
    ],
  },
  {
    id: 'interview-questions',
    label: '50 Interview Questions',
    readTime: '8 min',
    takeaways: [
      'Questions span behavioral, technical, architecture, prompting, and collaboration.',
      'Each item includes guidance and the interviewer signal being probed.',
      'Use these for self-drills and mock interview follow-up practice.',
    ],
  },
  {
    id: 'evaluation-rubric',
    label: 'Evaluation Rubric',
    readTime: '4 min',
    takeaways: [
      'Eight dimensions weighted roughly 10–15% each; aim for 3+ on most axes.',
      'Ownership and testing are non-negotiable for a hire signal.',
      'Compare your mocks against the sample strong-hire vs borderline scorecards.',
    ],
  },
  {
    id: 'common-mistakes',
    label: 'Common Mistakes',
    readTime: '5 min',
    takeaways: [
      'Top failures: unreviewed AI code, no clarification, no tests, poor prompting.',
      'Blaming the model signals lack of ownership — always accountable language.',
      'Each mistake entry includes a concrete fix; scan before your next mock.',
    ],
  },
  {
    id: 'preparation-roadmap',
    label: 'Preparation Roadmaps',
    readTime: '6 min',
    takeaways: [
      'Choose 7-, 15-, 30-, or 60-day tracks based on interview timeline.',
      '7-day crash: one full simulated session plus rubric self-score.',
      '60-day track layers DSA maintenance, format rotation, and weekly mocks.',
    ],
  },
  {
    id: 'practice-framework',
    label: 'Self-Practice Framework',
    readTime: '3 min',
    takeaways: [
      'Loop: generate → clarify → plan → collaborate → test → score → iterate.',
      'Use the question generator for ambiguous tasks; close the loop with mock feedback.',
      'Self-scoring is necessary but biased — add third-party rubric feedback when possible.',
    ],
  },
  {
    id: 'india-adoption',
    label: 'Trends in India',
    readTime: '5 min',
    takeaways: [
      'Confirmed: AI startups and GCCs pilot agentic-style tasks in 2024–2026.',
      'Projected: mass service-tier campus OAs likely 2027+ as vendors mature.',
      'Dual-speed market: campus DSA remains heavy; product hubs move faster.',
    ],
  },
  {
    id: 'future-of-hiring',
    label: 'Future of Hiring',
    readTime: '3 min',
    takeaways: [
      'Durable skills: judgment, domain expertise, communication, verification.',
      'Declining differentiators: raw typing speed and syntax memorization.',
      'Pair this hub with DSA fundamentals and AI mock practice for full-loop readiness.',
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    readTime: '6 min',
    takeaways: [
      'Forty answers target People Also Ask and AI Overview queries.',
      'Tool policies, India adoption, and rubric passing thresholds are covered.',
      'Expand items for deep dives; all answers remain in DOM for SEO schema parity.',
    ],
  },
] as const

export const AGENTIC_CHAPTER_COUNT = AGENTIC_CHAPTERS.length

export const AGENTIC_CHAPTER_META_LABEL = `4 Parts · ${AGENTIC_CHAPTER_COUNT} Chapters · Interactive guide`

export const AGENTIC_EXECUTIVE_SUMMARY = [
  'Agentic AI interview rounds evaluate how you clarify, plan, collaborate with AI, test, and own outcomes — not memorized algorithms.',
  'Treat yourself as the senior engineer; AI is a fast junior teammate you review, verify, and correct.',
  'Strong candidates spend 8–12 minutes on requirements before prompting; weak candidates paste unreviewed code.',
  'Eight rubric dimensions (clarification, planning, ownership, code quality, testing, communication, AI usage, decisions) drive hire/no-hire calls.',
  'India adoption is emerging at AI startups, GCCs, and product companies in 2025–2026; mass campus OAs lag behind.',
  'Prep with timed mocks, the 7/15/30/60-day roadmaps, and self-scoring against the rubric in this guide.',
  'Fundamentals still matter — you must catch when AI chooses the wrong algorithm, schema, or security pattern.',
] as const

export function getAgenticChapterById(id: string): AgenticChapter | undefined {
  return AGENTIC_CHAPTERS.find((c) => c.id === id)
}

export function getAgenticChapterNeighbors(id: string): {
  prev: AgenticChapter | null
  next: AgenticChapter | null
} {
  const index = AGENTIC_CHAPTERS.findIndex((c) => c.id === id)
  if (index < 0) return { prev: null, next: null }
  return {
    prev: index > 0 ? AGENTIC_CHAPTERS[index - 1]! : null,
    next: index < AGENTIC_CHAPTERS.length - 1 ? AGENTIC_CHAPTERS[index + 1]! : null,
  }
}
