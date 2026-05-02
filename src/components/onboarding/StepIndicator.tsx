interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  labels?: string[]
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels = [],
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const step = i + 1
        const isCompleted = step < currentStep
        const isCurrent = step === currentStep

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full
                             text-sm font-semibold transition-all duration-300
                             ${isCompleted
                               ? 'bg-(--accent-success) text-white'
                               : isCurrent
                               ? 'bg-(--accent-primary) text-white shadow-lg'
                               : 'bg-(--bg-tertiary) text-(--text-muted)'
                             }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              {labels[i] && (
                <span className={`text-[10px] font-medium
                  ${isCurrent ? 'text-(--text-primary)' : 'text-(--text-muted)'}`}>
                  {labels[i]}
                </span>
              )}
            </div>
            {i < totalSteps - 1 && (
              <div
                className={`mx-2 h-0.5 w-12 transition-all duration-500
                  ${isCompleted ? 'bg-(--accent-success)' : 'bg-(--bg-tertiary)'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
