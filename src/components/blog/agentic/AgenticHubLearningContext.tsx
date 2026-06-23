'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { AGENTIC_CHAPTERS } from '@/lib/seo/blog/agentic-ai-hub-chapters'
import {
  AGENTIC_PARTS,
  getAllChapterIdsOrdered,
  getChapterIndex,
  getPartForChapter,
} from '@/lib/seo/blog/agentic-ai-hub-parts'
import {
  getCompletionSnapshot,
  getServerCompletionSnapshot,
  markChapterComplete,
  subscribeCompletion,
} from '@/components/blog/agentic/agentic-completion-store'

interface AgenticLearningContextValue {
  activeId: string
  setActiveId: (id: string) => void
  completedIds: ReadonlySet<string>
  markComplete: (id: string) => void
  isComplete: (id: string) => boolean
  chapterIndex: number
  totalChapters: number
  partIndex: number
  totalParts: number
  completionPct: number
}

const AgenticLearningContext = createContext<AgenticLearningContextValue | null>(null)

export function AgenticHubLearningProvider({
  children,
  initialActiveId,
}: {
  children: ReactNode
  initialActiveId?: string
}) {
  const [activeId, setActiveId] = useState(initialActiveId ?? AGENTIC_CHAPTERS[0]!.id)
  const completedIds = useSyncExternalStore(
    subscribeCompletion,
    getCompletionSnapshot,
    getServerCompletionSnapshot,
  )

  const markComplete = useCallback((id: string) => {
    markChapterComplete(id)
  }, [])

  const totalChapters = getAllChapterIdsOrdered().length
  const chapterIndex = getChapterIndex(activeId)
  const partInfo = getPartForChapter(activeId)
  const completionPct = Math.round((completedIds.size / totalChapters) * 100)

  const value = useMemo(
    () => ({
      activeId,
      setActiveId,
      completedIds,
      markComplete,
      isComplete: (id: string) => completedIds.has(id),
      chapterIndex: chapterIndex > 0 ? chapterIndex : 1,
      totalChapters,
      partIndex: (partInfo?.partIndex ?? 0) + 1,
      totalParts: AGENTIC_PARTS.length,
      completionPct,
    }),
    [activeId, completedIds, markComplete, chapterIndex, totalChapters, partInfo, completionPct],
  )

  return <AgenticLearningContext.Provider value={value}>{children}</AgenticLearningContext.Provider>
}

export function useAgenticLearning() {
  const ctx = useContext(AgenticLearningContext)
  if (!ctx) throw new Error('useAgenticLearning must be used within AgenticHubLearningProvider')
  return ctx
}
