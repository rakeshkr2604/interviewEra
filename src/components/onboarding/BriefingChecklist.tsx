'use client'
import { useState } from 'react'
import { CheckSquare, Square } from 'lucide-react'

const CHECKLIST_ITEMS = [
  { id: 'quiet', label: 'I am in a quiet room', icon: '🔇' },
  { id: 'mic', label: 'My microphone is working', icon: '🎤' },
  { id: 'internet', label: 'I have a stable internet connection', icon: '📶' },
  { id: 'formal', label: 'I am ready to use a professional tone', icon: '👔' },
  { id: 'time', label: 'I have 15–20 minutes free', icon: '⏱️' },
]

interface BriefingChecklistProps {
  onAllChecked: (allChecked: boolean) => void
  onCheckedCountChange?: (count: number) => void
}

export function BriefingChecklist({ onAllChecked, onCheckedCountChange }: BriefingChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    const count = CHECKLIST_ITEMS.filter(item => next[item.id]).length
    onCheckedCountChange?.(count)
    onAllChecked(count === CHECKLIST_ITEMS.length)
  }

  return (
    <div className="space-y-3">
      {CHECKLIST_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => toggle(item.id)}
          className={`flex w-full items-center gap-3 rounded-xl border p-3
                      text-left transition-all duration-200 text-(--text-primary)
                      ${checked[item.id]
                        ? 'border-(--accent-success)/30 bg-(--accent-success)/10'
                        : 'border-(--card-border) bg-(--card-bg)'
                      }`}
        >
          {checked[item.id]
            ? <CheckSquare size={18} className="text-(--accent-success) shrink-0" />
            : <Square size={18} className="text-(--text-muted) shrink-0" />
          }
          <span className="text-sm text-(--text-primary)">{item.icon} {item.label}</span>
        </button>
      ))}
    </div>
  )
}
