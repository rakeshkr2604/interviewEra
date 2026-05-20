'use client'
import { cn } from '@/lib/utils'
import { GOAL_OPTIONS } from '@/types/onboarding.types'
import type { InterviewGoal } from '@/types/onboarding.types'
import { Check } from 'lucide-react'

interface GoalSelectorProps {
  selected: InterviewGoal | null
  onSelect: (goal: InterviewGoal) => void
  /** Tighter grid for combined onboarding step */
  dense?: boolean
}

export function GoalSelector({ selected, onSelect, dense = false }: GoalSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2', dense ? 'gap-2' : 'gap-3')}>
      {GOAL_OPTIONS.map(goal => {
        const isSelected = selected === goal.id
        return (
          <button
            key={goal.id}
            type="button"
            onClick={() => onSelect(goal.id)}
            aria-pressed={isSelected}
            className={cn(
              'relative rounded-2xl border text-left transition-all duration-200',
              dense ? 'p-3' : 'p-4',
              isSelected
                ? 'border-(--accent-primary) bg-(--accent-primary)/12 shadow-[0_0_0_1px_var(--accent-primary)]'
                : 'border-(--card-border) bg-(--card-bg) hover:border-(--accent-primary)/40 hover:bg-(--accent-primary)/5',
            )}
          >
            {isSelected && (
              <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-(--accent-primary)">
                <Check className="size-2.5 text-white" strokeWidth={3} aria-hidden />
              </span>
            )}
            <span className={dense ? 'text-xl' : 'text-2xl'}>{goal.emoji}</span>
            <p className={cn('mt-1.5 font-semibold text-(--text-primary)', dense ? 'text-xs' : 'text-sm')}>
              {goal.label}
            </p>
            <p className={cn('text-(--text-secondary)', dense ? 'mt-0.5 text-[11px] leading-snug' : 'text-xs')}>
              {goal.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}
