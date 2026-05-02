interface ProgressBarProps {
  current: number; // 1-indexed
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Question {current} of {total}
        {current === total ? ' — Almost there!' : ''}
      </p>
      {/* Individual blocks per question (not a smooth bar) */}
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const num = i + 1;
          return (
            <div
              key={i}
              className={`h-2.5 flex-1 rounded-sm transition-colors duration-300 ${
                num < current
                  ? 'bg-green-500'
                  : num === current
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
