import { AGENTIC_HERO_ALT, AGENTIC_HERO_PATH } from '@/lib/seo/blog/agentic-ai-hub'
import type { AgenticSpokeConfig } from '@/lib/seo/blog/agentic-cluster-mvp'

export const AI_PROMPT_ENGINEERING_PATH = '/blog/ai-prompt-engineering-interview'

export const AI_PROMPT_ENGINEERING_CONFIG: AgenticSpokeConfig = {
  category: 'Agentic AI',
  singleTitle: 'AI Prompt Engineering for Technical Interviews (Examples & Rubric)',
  metaTitle: 'AI Prompt Engineering for Technical Interviews (2026)',
  description:
    'How to write interview prompts that score well — poor vs good vs improved examples for APIs, debugging, and code review, plus rubric signals interviewers watch in agentic rounds.',
  canonicalPath: AI_PROMPT_ENGINEERING_PATH,
  keywords:
    'AI prompt engineering interview, coding interview prompts, how to prompt in technical interview, agentic interview prompts, Cursor prompts interview',
  publishedDate: '2026-06-23',
  lastUpdated: '2026-06-23',
  updatedLabel: 'Updated June 2026',
  readTime: '15 min read',
  heroPath: AGENTIC_HERO_PATH,
  heroAlt: AGENTIC_HERO_ALT,
  breadcrumbLabel: 'AI Prompt Engineering',
  geoLead:
    'AI prompt engineering in technical interviews means writing precise, iterative instructions that give the model stack context, file paths, constraints, and expected outputs — so you spend review time on quality, not fixing ambiguity you created.',
  quickAnswer:
    'Strong interview prompts include stack, relevant files, validation rules, forbidden dependencies, and test expectations. Weak prompts ("build the API", "fix the bug") force the model to guess — and interviewers see that as a junior signal.',
  takeaways: [
    'Prompt in small iterations: clarify → implement → test → fix — not one giant request.',
    'Include file paths and existing patterns so AI matches your codebase.',
    'Ask for tests in the same prompt as implementation when time is tight.',
    'Visible prompts are part of your work product — narrate why you chose each instruction.',
    'Interviewers penalize dependency: accepting output you cannot explain or test.',
  ],
  comparisonTable: {
    caption: 'Prompt quality signals on the interview scorecard',
    headers: ['Signal', 'Weak prompt behavior', 'Strong prompt behavior'],
    rows: [
      ['Context', 'No stack or file paths', 'Stack, paths, and patterns specified'],
      ['Scope', 'Vague feature request', 'Bounded task with validation rules'],
      ['Verification', 'No tests requested', 'Happy path + edge cases in prompt'],
      ['Iteration', 'One-shot mega prompt', 'Layered prompts per concern'],
      ['Ownership', 'Blind accept of diff', 'Review, edit, explain changes aloud'],
    ],
  },
  faq: [
    {
      question: 'What makes a good prompt in a coding interview?',
      answer:
        'Stack, constraints, file paths, expected status codes or error shapes, and test cases. Example: "POST /tasks in src/routes/tasks.ts — validate title 1–120 chars, 400 on error, add vitest for empty title."',
    },
    {
      question: 'Should I show my prompts to the interviewer?',
      answer:
        'Yes when screen sharing or using a monitored IDE. Treat prompts as professional communication — clear, concise, and intentional.',
    },
    {
      question: 'How many prompts should I use in a 60-minute round?',
      answer:
        'Often 4–8 focused prompts beat one huge prompt: clarification notes, implementation, tests, debug, and security review as separate steps.',
    },
    {
      question: 'Can bad prompting fail me even if the code works?',
      answer:
        'Yes. Unreviewed lucky output signals risk in production. Interviewers hire for sustainable collaboration habits.',
    },
    {
      question: 'How do I practice prompting?',
      answer:
        'Use the question generator for ambiguous tasks, copy the example prompts on this page, and compare your diffs against rubric dimensions in the pillar guide.',
    },
    {
      question: 'Does prompt engineering replace DSA knowledge?',
      answer:
        'No. You need fundamentals to verify AI-chosen algorithms, data structures, and complexity claims.',
    },
  ],
}
