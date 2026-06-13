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
    <div className={cn('grid grid-cols-2', dense ? 'gap-1.5 sm:gap-2' : 'gap-3')}>
      {GOAL_OPTIONS.map((goal) => {
        const isSelected = selected === goal.id
        return (
          <button
            key={goal.id}
            type="button"
            onClick={() => onSelect(goal.id)}
            aria-pressed={isSelected}
            className={cn(
              'relative rounded-xl border text-left transition-all duration-200',
              dense ? 'p-2.5 sm:p-3' : 'rounded-2xl p-4',
              isSelected
                ? 'border-(--accent-primary) bg-(--accent-primary)/12 shadow-[0_0_0_1px_var(--accent-primary)]'
                : 'border-(--card-border) bg-(--card-bg) hover:border-(--accent-primary)/40 hover:bg-(--accent-primary)/5',
            )}
          >
            {isSelected && (
              <span className="absolute right-2 top-2 flex size-3.5 items-center justify-center rounded-full bg-(--accent-primary) sm:right-2.5 sm:top-2.5 sm:size-4">
                <Check className="size-2 text-white sm:size-2.5" strokeWidth={3} aria-hidden />
              </span>
            )}
            <div className="flex items-center gap-1.5 pr-4 sm:pr-5">
              <span
                className={cn('shrink-0 leading-none', dense ? 'text-base sm:text-lg' : 'text-xl')}
                aria-hidden
              >
                {goal.emoji}
              </span>
              <p
                className={cn(
                  'min-w-0 font-semibold leading-snug text-(--text-primary)',
                  dense ? 'text-[11px] sm:text-xs' : 'text-sm',
                )}
              >
                {goal.label}
              </p>
            </div>
            <p
              className={cn(
                'text-(--text-secondary)',
                dense ? 'mt-0.5 text-[10px] leading-snug sm:text-[11px]' : 'mt-1 text-xs',
              )}
            >
              {goal.description}
            </p>
          </button>
        )
      })}
    </div>
  )
}
