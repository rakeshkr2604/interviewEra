import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  labels?: string[]
  /** Tighter circles and type — use in dense page headers */
  dense?: boolean
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels = [],
  dense = false,
}: StepIndicatorProps) {
  return (
    <div className={cn('flex items-center justify-center gap-0')}>
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNum = i + 1
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep

        return (
          <div key={stepNum} className="flex items-center">
            <div className={cn('flex flex-col items-center', dense ? 'gap-0.5' : 'gap-1')}>
              <div
                className={cn(
                  'flex items-center justify-center rounded-full font-semibold transition-all duration-300',
                  dense ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm',
                  isCompleted
                    ? 'bg-(--accent-success) text-white'
                    : isCurrent
                      ? 'bg-(--accent-primary) text-white shadow-lg'
                      : 'bg-(--bg-tertiary) text-(--text-muted)',
                )}
              >
                {isCompleted ? '✓' : stepNum}
              </div>
              {labels[i] ? (
                <span
                  className={cn(
                    'max-w-[5.5rem] text-center font-medium leading-tight sm:max-w-[6.25rem]',
                    dense ? 'text-[9px]' : 'text-[10px]',
                    isCurrent ? 'text-(--text-primary)' : 'text-(--text-muted)',
                  )}
                >
                  {labels[i]}
                </span>
              ) : null}
            </div>
            {i < totalSteps - 1 ? (
              <div
                className={cn(
                  'h-0.5 transition-all duration-500',
                  dense ? 'mx-1.5 w-10 sm:w-12' : 'mx-2 w-12',
                  isCompleted ? 'bg-(--accent-success)' : 'bg-(--bg-tertiary)',
                )}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
