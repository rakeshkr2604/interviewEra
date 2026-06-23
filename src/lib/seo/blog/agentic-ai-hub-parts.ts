import type { AgenticChapter } from '@/lib/seo/blog/agentic-ai-hub-chapters'

export type AgenticDifficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export interface AgenticPart {
  id: string
  title: string
  subtitle: string
  intro: string
  chapterIds: readonly string[]
}

export const AGENTIC_PARTS: readonly AgenticPart[] = [
  {
    id: 'foundations',
    title: 'Part I — Foundations',
    subtitle: 'Understand the shift',
    intro:
      'Learn what agentic AI interview rounds are, why companies adopt them, how interviews evolved, and what “agentic” really means before you touch an IDE.',
    chapterIds: [
      'what-is-agentic-ai-interview',
      'why-companies-adopt',
      'interview-evolution-timeline',
      'what-agentic-means',
    ],
  },
  {
    id: 'interview-process',
    title: 'Part II — The Interview Process',
    subtitle: 'How you are evaluated',
    intro:
      'Walk through the live loop — skills scored, senior mindset, formats, a minute-by-minute workflow, and a side-by-side simulation of weak vs strong candidates.',
    chapterIds: [
      'how-it-works',
      'skills-evaluated',
      'senior-engineer-mindset',
      'interview-formats',
      'sample-60-minute-workflow',
      'real-example-simulation',
    ],
  },
  {
    id: 'preparation',
    title: 'Part III — Preparation & Practice',
    subtitle: 'Train like the rubric',
    intro:
      'Drill questions, study the scoring matrix, avoid common mistakes, follow structured roadmaps, and run the self-practice loop before your next loop.',
    chapterIds: [
      'interview-questions',
      'evaluation-rubric',
      'common-mistakes',
      'preparation-roadmap',
      'practice-framework',
    ],
  },
  {
    id: 'future-hiring',
    title: 'Part IV — Future of AI Hiring',
    subtitle: 'India & what comes next',
    intro:
      'See where agentic rounds are landing in India, which skills stay valuable, and get answers to the forty most-searched candidate questions.',
    chapterIds: ['india-adoption', 'future-of-hiring', 'faq'],
  },
] as const

export const AGENTIC_CHAPTER_DIFFICULTY: Record<string, AgenticDifficulty> = {
  'what-is-agentic-ai-interview': 'Beginner',
  'why-companies-adopt': 'Beginner',
  'interview-evolution-timeline': 'Beginner',
  'what-agentic-means': 'Beginner',
  'how-it-works': 'Beginner',
  'skills-evaluated': 'Intermediate',
  'senior-engineer-mindset': 'Intermediate',
  'interview-formats': 'Intermediate',
  'sample-60-minute-workflow': 'Intermediate',
  'real-example-simulation': 'Intermediate',
  'interview-questions': 'Intermediate',
  'evaluation-rubric': 'Intermediate',
  'common-mistakes': 'Beginner',
  'preparation-roadmap': 'Beginner',
  'practice-framework': 'Intermediate',
  'india-adoption': 'Intermediate',
  'future-of-hiring': 'Beginner',
  faq: 'Beginner',
}

export function getPartForChapter(chapterId: string): { part: AgenticPart; partIndex: number } | null {
  const partIndex = AGENTIC_PARTS.findIndex((p) => p.chapterIds.includes(chapterId))
  if (partIndex < 0) return null
  return { part: AGENTIC_PARTS[partIndex]!, partIndex }
}

export function getChapterIndex(chapterId: string): number {
  let n = 0
  for (const part of AGENTIC_PARTS) {
    for (const id of part.chapterIds) {
      n += 1
      if (id === chapterId) return n
    }
  }
  return -1
}

export function getAllChapterIdsOrdered(): string[] {
  return AGENTIC_PARTS.flatMap((p) => [...p.chapterIds])
}

export function enrichChapter(chapter: AgenticChapter, id: string) {
  const index = getChapterIndex(id)
  const partInfo = getPartForChapter(id)
  return {
    ...chapter,
    id,
    index,
    difficulty: AGENTIC_CHAPTER_DIFFICULTY[id] ?? 'Beginner',
    partId: partInfo?.part.id ?? '',
    partIndex: partInfo?.partIndex ?? 0,
  }
}

export type EnrichedChapter = ReturnType<typeof enrichChapter>
