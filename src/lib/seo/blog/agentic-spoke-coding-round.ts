import { AGENTIC_HERO_ALT, AGENTIC_HERO_PATH } from '@/lib/seo/blog/agentic-ai-hub'
import type { AgenticSpokeConfig } from '@/lib/seo/blog/agentic-cluster-mvp'

export const AGENTIC_CODING_ROUND_PATH = '/blog/agentic-coding-round'

export const AGENTIC_CODING_ROUND_CONFIG: AgenticSpokeConfig = {
  category: 'Agentic AI',
  singleTitle: 'What Is an Agentic Coding Round? Format, Rubric & Examples',
  metaTitle: 'Agentic Coding Round: Format & How to Pass (2026)',
  description:
    'Agentic coding round explained — live format, what interviewers evaluate, tool policies, weak vs strong signals, and how to prepare for AI-assisted technical interviews.',
  canonicalPath: AGENTIC_CODING_ROUND_PATH,
  keywords:
    'agentic coding round, agentic coding interview, AI coding round, agentic technical interview, AI assisted coding interview format',
  publishedDate: '2026-06-23',
  lastUpdated: '2026-06-23',
  updatedLabel: 'Updated June 2026',
  readTime: '14 min read',
  heroPath: AGENTIC_HERO_PATH,
  heroAlt: AGENTIC_HERO_ALT,
  breadcrumbLabel: 'Agentic Coding Round',
  geoLead:
    'An agentic coding round is a live or take-home technical interview where you may use AI coding assistants (Cursor, Claude, Copilot, ChatGPT) while interviewers score clarification, planning, prompting, verification, testing, and ownership — not memorized syntax.',
  quickAnswer:
    'Expect a practical task (API, bug fix, or feature), permitted AI tools, and continuous evaluation from clarification through discussion. Strong candidates clarify first, prompt in small chunks, review every diff, and ship tested code they can explain.',
  takeaways: [
    'Agentic coding rounds mirror real IDE workflows — treat AI as a junior teammate you review.',
    'First 10 minutes: clarify requirements before prompting for implementation.',
    'Interviewers watch prompts, diffs, tests, and narration — not just the final file tree.',
    'Tool policy varies: confirm allowed assistants at the start of every round.',
    'Failing signals: blind paste, no tests, cannot explain validation or security choices.',
  ],
  comparisonTable: {
    caption: 'Traditional coding round vs agentic coding round',
    headers: ['Dimension', 'Traditional round', 'Agentic coding round'],
    rows: [
      ['Environment', 'Bare IDE or whiteboard', 'AI-enabled IDE often permitted'],
      ['Task type', 'Algorithm puzzle or small function', 'API, bug fix, feature slice'],
      ['Primary signal', 'Correctness + complexity', 'Judgment + verification + ownership'],
      ['AI usage', 'Usually banned', 'Encouraged within policy'],
      ['Discussion', 'Explain algorithm', 'Explain trade-offs, tests, and AI collaboration'],
    ],
  },
  faq: [
    {
      question: 'What happens in an agentic coding round?',
      answer:
        'You receive a problem, clarify requirements, plan, implement with AI assistance, test, and discuss trade-offs. Interviewers observe the full loop — not only the final code.',
    },
    {
      question: 'How long is an agentic coding interview?',
      answer:
        'Typically 45–90 minutes live. Take-home agentic assignments may run 2–4 hours with documented AI use policies.',
    },
    {
      question: 'Can I use ChatGPT in an agentic coding round?',
      answer:
        'Only if the company allows it. Some provide a sandbox IDE; others permit browser tools. Always ask before the clock starts.',
    },
    {
      question: 'What do interviewers write on the scorecard?',
      answer:
        'Notes on clarification quality, prompt discipline, code review habits, test coverage, communication, and whether you owned security and scope decisions.',
    },
    {
      question: 'Is LeetCode-style DSA still tested separately?',
      answer:
        'Many companies keep a DSA screen plus an agentic practical round. Do not assume one replaces the other.',
    },
    {
      question: 'How do I practice agentic coding rounds?',
      answer:
        'Use timed self-mocks with ambiguous tasks, record your screen, self-score against a rubric, and run InterviewEra mock interviews for third-party feedback.',
    },
  ],
}
