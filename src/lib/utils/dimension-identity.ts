import { FileCheck, Target, Layers, MessageCircle, Lightbulb, type LucideIcon } from 'lucide-react'
import type { DimensionKey } from '@/lib/interview/answer-score/rubric'

/**
 * Fixed per-rubric-dimension identity (icon + hue) — single source of truth
 * so "Content Accuracy" (etc.) always carries the same icon/color wherever
 * it's shown (Analytics Skill Breakdown, Readiness Focus Areas, ...).
 * Distinct from any tier/status color on a progress bar next to it — this is
 * identity (which dimension), never magnitude/status (how well you scored).
 * Assigned in fixed order by dimension key, never cycled by array index.
 */
export const DIMENSION_IDENTITY: Record<DimensionKey, { icon: LucideIcon; color: string }> = {
  content_accuracy: { icon: FileCheck, color: '#16a34a' },
  relevance: { icon: Target, color: '#2563eb' },
  structure: { icon: Layers, color: '#7c3aed' },
  communication_clarity: { icon: MessageCircle, color: '#ea580c' },
  specificity: { icon: Lightbulb, color: '#db2777' },
}
