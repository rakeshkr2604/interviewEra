import { AGENTIC_CANONICAL_PATH } from '@/lib/seo/blog/agentic-ai-hub'

/** Pillar + MVP cluster spokes — single source for cross-linking. */
export const AGENTIC_PILLAR_PATH = AGENTIC_CANONICAL_PATH

export const AGENTIC_CLUSTER_MVP_PAGES = [
  {
    path: AGENTIC_PILLAR_PATH,
    label: 'Agentic AI Interview Guide (2026)',
    teaser: 'Full rubric, 50 questions, India trends, and prep roadmaps.',
  },
  {
    path: '/blog/what-is-agentic-ai',
    label: 'What Is Agentic AI?',
    teaser: 'Definition, examples, and how it differs from autocomplete.',
  },
  {
    path: '/blog/agentic-coding-round',
    label: 'Agentic Coding Round',
    teaser: 'Format, timeline, and what interviewers score live.',
  },
  {
    path: '/blog/ai-prompt-engineering-interview',
    label: 'AI Prompt Engineering for Interviews',
    teaser: 'Poor vs strong prompts with copy-ready examples.',
  },
  {
    path: '/blog/cursor-ai-interview-guide',
    label: 'Cursor AI Interview Guide',
    teaser: 'IDE setup, policies, and live-round tactics.',
  },
] as const

export type AgenticClusterMvpPath = (typeof AGENTIC_CLUSTER_MVP_PAGES)[number]['path']

export function getAgenticClusterLinks(excludePath: string) {
  return AGENTIC_CLUSTER_MVP_PAGES.filter((p) => p.path !== excludePath)
}

export interface AgenticSpokeFaqItem {
  question: string
  answer: string
}

export interface AgenticSpokeConfig {
  category: string
  singleTitle: string
  metaTitle: string
  description: string
  canonicalPath: string
  keywords: string
  publishedDate: string
  lastUpdated: string
  updatedLabel: string
  readTime: string
  heroPath: string
  heroAlt: string
  breadcrumbLabel: string
  geoLead: string
  quickAnswer: string
  takeaways: readonly string[]
  comparisonTable?: {
    caption: string
    headers: readonly string[]
    rows: readonly (readonly string[])[]
  }
  faq: readonly AgenticSpokeFaqItem[]
}
