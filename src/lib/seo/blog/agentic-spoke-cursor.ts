import { AGENTIC_MINDSET_ALT, AGENTIC_MINDSET_PATH } from '@/lib/seo/blog/agentic-ai-hub'
import type { AgenticSpokeConfig } from '@/lib/seo/blog/agentic-cluster-mvp'

export const CURSOR_AI_INTERVIEW_PATH = '/blog/cursor-ai-interview-guide'

export const CURSOR_AI_INTERVIEW_CONFIG: AgenticSpokeConfig = {
  category: 'Agentic AI',
  singleTitle: 'Cursor AI Interview Guide: Setup, Policy & Live-Round Tactics',
  metaTitle: 'Cursor Interview Guide: AI Coding Interviews (2026)',
  description:
    'Prepare for interviews that allow Cursor — IDE setup, Composer vs Chat, prompting tactics, what interviewers see on screen share, and how to pass agentic rounds with Cursor.',
  canonicalPath: CURSOR_AI_INTERVIEW_PATH,
  keywords:
    'Cursor interview, Cursor AI interview, Cursor coding interview, Cursor technical interview, prepare for Cursor interview 2026',
  publishedDate: '2026-06-23',
  lastUpdated: '2026-06-23',
  updatedLabel: 'Updated June 2026',
  readTime: '13 min read',
  heroPath: AGENTIC_MINDSET_PATH,
  heroAlt: AGENTIC_MINDSET_ALT,
  breadcrumbLabel: 'Cursor AI Interview Guide',
  geoLead:
    'A Cursor AI interview is a technical round where you may use the Cursor IDE — Chat, Composer, and inline edits — while interviewers evaluate how you clarify requirements, prompt, review multi-file diffs, test, and explain decisions. Cursor is a common permitted tool in agentic coding rounds at product companies and AI startups in 2026.',
  quickAnswer:
    'Before the round: confirm Cursor is allowed, practice Composer for bounded tasks, and rehearse narrating your review process. During the round: clarify first, use @-mentions for file context, iterate in small diffs, and never merge AI output you cannot explain or test.',
  takeaways: [
    'Confirm tool policy — some companies allow only built-in copilots, not full Cursor.',
    'Use @file and @folder context so Cursor matches existing patterns.',
    'Composer for multi-file tasks; Chat for debugging and explanation — know when to use each.',
    'Interviewers see your prompts and diffs on screen share — write them as deliberately as code.',
    'Practice with the same Cursor version and keybindings before interview day.',
  ],
  comparisonTable: {
    caption: 'Cursor features in agentic interview rounds',
    headers: ['Feature', 'Best for in interviews', 'Interviewer signal'],
    rows: [
      ['Inline tab complete', 'Boilerplate, small edits', 'Efficiency — not enough alone'],
      ['Chat', 'Debug, explain error, single-file fix', 'Communication + verification'],
      ['Composer / Agent', 'Multi-file feature, tests', 'Planning + review discipline'],
      ['@-mentions', 'Grounding in repo context', 'Senior-level prompting'],
      ['Terminal integration', 'Run tests, reproduce bugs', 'Ownership + quality bar'],
    ],
  },
  faq: [
    {
      question: 'Is Cursor allowed in coding interviews?',
      answer:
        'Increasingly yes at AI-forward companies — but policy is employer-specific. Never assume; ask which tools are permitted before you start.',
    },
    {
      question: 'Should I use Composer or Chat in a live round?',
      answer:
        'Use Chat for narrow questions and debugging. Use Composer when you need coordinated multi-file changes — but review the full diff before accepting.',
    },
    {
      question: 'Can interviewers see my Cursor prompts?',
      answer:
        'In most virtual loops, yes — via screen share or recorded session. Write prompts as if they are part of your submission.',
    },
    {
      question: 'How do I practice Cursor for interviews?',
      answer:
        'Run timed tasks from the question generator, record yourself, and compare against the prompt engineering and agentic coding round guides in this series.',
    },
    {
      question: 'What if the company bans Cursor but I trained on it?',
      answer:
        'Prompting and review skills transfer to Copilot, Claude Code, or browser ChatGPT. Principles stay the same; UI changes.',
    },
    {
      question: 'Does Cursor replace knowing the codebase?',
      answer:
        'No. You must validate imports, types, auth, and tests. AI accelerates typing — not accountability.',
    },
  ],
}
