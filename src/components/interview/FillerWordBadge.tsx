'use client'
import type { FillerAnalysis } from '@/hooks/useFillerDetection'

interface FillerWordBadgeProps {
  analysis: FillerAnalysis
}

const SEVERITY_STYLES = {
  safe: 'bg-(--accent-success)/10 text-(--accent-success) border-(--accent-success)/20',
  warning: 'bg-(--accent-warning)/10 text-(--accent-warning) border-(--accent-warning)/20',
  severe: 'bg-(--accent-danger)/10 text-(--accent-danger) border-(--accent-danger)/20',
}

export function FillerWordBadge({ analysis }: FillerWordBadgeProps) {
  if (analysis.count === 0) return null

  return (
    <div className={`rounded-xl border p-3 text-xs ${SEVERITY_STYLES[analysis.severity]}`}>
      <div className="flex items-center justify-between font-semibold">
        <span>Filler Words Detected</span>
        <span>{analysis.count} ({analysis.ratePerMinute}/min)</span>
      </div>
      <p className="mt-1 opacity-80">{analysis.message}</p>
      {analysis.words.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {analysis.words.slice(0, 4).map(w => (
            <span key={w.word}
                  className="rounded-full border px-2 py-0.5 font-mono opacity-70">
              &quot;{w.word}&quot; ×{w.occurrences}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
