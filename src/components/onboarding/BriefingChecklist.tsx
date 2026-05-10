'use client'

import { useState } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

const CHECKLIST_ITEMS_FULL = [
  { id: 'quiet', label: 'I am in a quiet room', icon: '🔇' },
  { id: 'mic', label: 'My microphone is working', icon: '🎤' },
  { id: 'internet', label: 'I have a stable internet connection', icon: '📶' },
  { id: 'time', label: 'I have 15–20 minutes free', icon: '⏱️' },
  { id: 'formal', label: 'I am ready to use a professional tone', icon: '👔' },
] as const

/** Shorter list for fast repeat sessions */
const CHECKLIST_ITEMS_QUICK = [
  { id: 'quiet', label: 'Quiet space', icon: '🔇' },
  { id: 'mic', label: 'Mic works', icon: '🎤' },
  { id: 'time', label: '~15 min free', icon: '⏱️' },
] as const

interface BriefingChecklistProps {
  onAllChecked: (allChecked: boolean) => void
  onCheckedCountChange?: (count: number) => void
  compact?: boolean
  /** `quick` = 3 essentials for faster onboarding */
  variant?: 'full' | 'quick'
}

export function BriefingChecklist({
  onAllChecked,
  onCheckedCountChange,
  compact = false,
  variant = 'full',
}: BriefingChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const items = variant === 'quick' ? CHECKLIST_ITEMS_QUICK : CHECKLIST_ITEMS_FULL

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    const count = items.filter((item) => next[item.id]).length
    onCheckedCountChange?.(count)
    onAllChecked(count === items.length)
  }

  return (
    <div className={cn(compact ? 'space-y-2' : 'space-y-3')}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => toggle(item.id)}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border text-left transition-all duration-200 text-(--text-primary)',
            compact ? 'p-2.5' : 'p-3 gap-3',
            checked[item.id]
              ? 'border-(--accent-success)/30 bg-(--accent-success)/10'
              : 'border-(--card-border) bg-(--card-bg)',
          )}
        >
          {checked[item.id] ? (
            <CheckSquare size={compact ? 16 : 18} className="text-(--accent-success) shrink-0" />
          ) : (
            <Square size={compact ? 16 : 18} className="text-(--text-muted) shrink-0" />
          )}
          <span className={cn('text-(--text-primary)', compact ? 'text-xs' : 'text-sm')}>
            {item.icon} {item.label}
          </span>
        </button>
      ))}
    </div>
  )
}
