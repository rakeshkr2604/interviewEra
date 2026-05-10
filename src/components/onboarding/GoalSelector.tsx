'use client'
import { cn } from '@/lib/utils'
import { GOAL_OPTIONS } from '@/types/onboarding.types'
import type { InterviewGoal } from '@/types/onboarding.types'

interface GoalSelectorProps {
  selected: InterviewGoal | null
  onSelect: (goal: InterviewGoal) => void
  /** Tighter grid for combined onboarding step */
  dense?: boolean
}

export function GoalSelector({ selected, onSelect, dense = false }: GoalSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2', dense ? 'gap-2' : 'gap-3')}>
      {GOAL_OPTIONS.map(goal => (
        <button
          key={goal.id}
          onClick={() => onSelect(goal.id)}
          className={cn(
            'rounded-2xl border text-left transition-all duration-200',
            dense ? 'p-3' : 'p-4',
            selected === goal.id
              ? 'border-(--accent-primary) bg-(--accent-primary)/10'
              : 'border-(--card-border) bg-(--card-bg) hover:border-(--accent-primary)/40'
          )}
        >
          <span className={dense ? 'text-xl' : 'text-2xl'}>{goal.emoji}</span>
          <p className={cn('mt-1.5 font-semibold text-(--text-primary)', dense ? 'text-xs' : 'text-sm')}>
            {goal.label}
          </p>
          <p className={cn('text-(--text-secondary)', dense ? 'mt-0.5 text-[11px] leading-snug' : 'text-xs')}>
            {goal.description}
          </p>
        </button>
      ))}
    </div>
  )
}
