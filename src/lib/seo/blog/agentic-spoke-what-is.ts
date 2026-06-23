import { AGENTIC_HERO_ALT, AGENTIC_HERO_PATH } from '@/lib/seo/blog/agentic-ai-hub'
import type { AgenticSpokeConfig } from '@/lib/seo/blog/agentic-cluster-mvp'

export const WHAT_IS_AGENTIC_AI_PATH = '/blog/what-is-agentic-ai'

export const WHAT_IS_AGENTIC_AI_CONFIG: AgenticSpokeConfig = {
  category: 'Agentic AI',
  singleTitle: 'What Is Agentic AI? Definition, Examples & Interview Context',
  metaTitle: 'What Is Agentic AI? (Definition & Interview Guide 2026)',
  description:
    'Agentic AI explained for engineers — definition, how it differs from autocomplete and chatbots, real interview examples, and why companies test human-AI collaboration in 2026 hiring.',
  canonicalPath: WHAT_IS_AGENTIC_AI_PATH,
  keywords:
    'what is agentic AI, agentic AI meaning, agentic AI explained, AI agent interview, agentic vs AI assisted, agentic AI definition 2026',
  publishedDate: '2026-06-23',
  lastUpdated: '2026-06-23',
  updatedLabel: 'Updated June 2026',
  readTime: '12 min read',
  heroPath: AGENTIC_HERO_PATH,
  heroAlt: AGENTIC_HERO_ALT,
  breadcrumbLabel: 'What Is Agentic AI',
  geoLead:
    'Agentic AI is software that can plan multi-step tasks, use tools, and iterate toward a goal with limited human direction — while a human engineer retains accountability for requirements, review, testing, and merge decisions. In hiring, "agentic" describes interview rounds that evaluate this collaboration, not raw typing speed.',
  quickAnswer:
    'Agentic AI means an AI system that breaks work into steps, calls tools (files, terminal, APIs), and proposes changes across a codebase — with you as the senior engineer who clarifies, reviews, tests, and owns the outcome.',
  takeaways: [
    'Agentic AI goes beyond autocomplete: it plans, uses tools, and iterates on multi-file work.',
    'You remain accountable — interviewers score judgment and verification, not AI throughput.',
    'Agentic differs from "AI-assisted" when the model drives multi-step execution, not single suggestions.',
    'Companies adopt agentic interviews because daily engineering already works this way in 2026.',
    'Fundamentals still matter: you must catch wrong algorithms, schemas, and security flaws in AI output.',
  ],
  comparisonTable: {
    caption: 'Autocomplete vs chatbot vs agentic AI (engineering context)',
    headers: ['Capability', 'Tab autocomplete', 'Chat Q&A', 'Agentic AI'],
    rows: [
      ['Scope', 'Current line or block', 'Single-turn answers', 'Multi-step plans across files'],
      ['Tool use', 'None', 'Limited / none in IDE', 'Reads files, runs commands, edits repos'],
      ['Human role', 'Accept or reject suggestion', 'Copy answer manually', 'Direct, review, test, own'],
      ['Interview signal', 'Low — commodity skill', 'Low — not live workflow', 'High — mirrors 2026 shipping'],
      ['Risk if misused', 'Minor bugs', 'Hallucinated facts', 'Unreviewed production code'],
    ],
  },
  faq: [
    {
      question: 'What is agentic AI in simple terms?',
      answer:
        'Agentic AI is AI that can pursue a goal through multiple steps — reading context, choosing tools, and proposing implementations — while a human supervises and approves work.',
    },
    {
      question: 'Is agentic AI the same as an AI agent?',
      answer:
        'In practice, yes for engineering interviews. "Agent" emphasizes autonomous sub-task execution; "agentic" emphasizes the workflow where humans orchestrate and verify agents.',
    },
    {
      question: 'How is agentic AI different from GitHub Copilot autocomplete?',
      answer:
        'Autocomplete suggests the next lines. Agentic systems plan broader changes — new files, tests, refactors — and may run terminal commands or search the repo.',
    },
    {
      question: 'Why do interviews use the word "agentic"?',
      answer:
        'Because hiring loops want to measure how you collaborate with AI the way product teams do today — not whether you can code without any tools.',
    },
    {
      question: 'Do I need to understand LLMs to pass agentic interviews?',
      answer:
        'You need practical collaboration skills: prompting, reviewing diffs, testing, and explaining trade-offs. Deep ML theory is rarely required for SWE agentic rounds.',
    },
    {
      question: 'Is agentic AI only for senior engineers?',
      answer:
        'Formats vary. Juniors face agentic tasks too, but interviewers expect proportional ownership — clear questions, basic tests, and honest discussion of what you do not know.',
    },
    {
      question: 'Where should I read next?',
      answer:
        'Start with the full Agentic AI Interview Guide pillar for rubrics, 50 questions, and India trends — then read the agentic coding round and prompt engineering guides in this series.',
    },
  ],
}
