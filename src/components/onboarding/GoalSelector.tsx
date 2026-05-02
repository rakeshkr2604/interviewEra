'use client'
import { GOAL_OPTIONS } from '@/types/onboarding.types'
import type { InterviewGoal } from '@/types/onboarding.types'

interface GoalSelectorProps {
  selected: InterviewGoal | null
  onSelect: (goal: InterviewGoal) => void
}

export function GoalSelector({ selected, onSelect }: GoalSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {GOAL_OPTIONS.map(goal => (
        <button
          key={goal.id}
          onClick={() => onSelect(goal.id)}
          className={`rounded-2xl border p-4 text-left transition-all duration-200
            ${selected === goal.id
              ? 'border-(--accent-primary) bg-(--accent-primary)/10'
              : 'border-(--card-border) bg-(--card-bg) hover:border-(--accent-primary)/40'
            }`}
        >
          <span className="text-2xl">{goal.emoji}</span>
          <p className="mt-2 font-semibold text-(--text-primary) text-sm">
            {goal.label}
          </p>
          <p className="text-xs text-(--text-secondary)">{goal.description}</p>
        </button>
      ))}
    </div>
  )
}
