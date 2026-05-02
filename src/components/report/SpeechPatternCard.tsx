'use client'
import type { FillerAnalysis } from '@/hooks/useFillerDetection'

interface SpeechPatternCardProps {
  analyses: FillerAnalysis[]
  totalDurationSeconds: number
}

const SEVERITY_COLOR = {
  safe: 'var(--accent-success)',
  warning: 'var(--accent-warning)',
  severe: 'var(--accent-danger)',
}

export function SpeechPatternCard({ analyses }: SpeechPatternCardProps) {
  const totalFillers = analyses.reduce((sum, a) => sum + a.count, 0)
  const avgRate = analyses.length > 0
    ? Math.round(analyses.reduce((sum, a) => sum + a.ratePerMinute, 0) / analyses.length)
    : 0

  const overallSeverity =
    avgRate >= 9 ? 'severe' : avgRate >= 6 ? 'warning' : 'safe'

  const allWords = analyses.flatMap(a => a.words)
  const wordMap = new Map<string, number>()
  allWords.forEach(w => wordMap.set(w.word, (wordMap.get(w.word) ?? 0) + w.occurrences))
  const topFillers = [...wordMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="rounded-2xl border border-(--card-border)
                    bg-(--card-bg) p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-(--text-primary)">Speech Patterns</h3>
        <span className="text-xs font-semibold px-2 py-1 rounded-full"
              style={{
                background: `${SEVERITY_COLOR[overallSeverity]}20`,
                color: SEVERITY_COLOR[overallSeverity],
              }}>
          {overallSeverity === 'safe' ? 'Good' : overallSeverity === 'warning' ? 'Watch Out' : 'Needs Work'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-(--bg-secondary) p-3 text-center">
          <p className="text-2xl font-bold text-(--text-primary)">{totalFillers}</p>
          <p className="text-xs text-(--text-secondary)">Total filler words</p>
        </div>
        <div className="rounded-xl bg-(--bg-secondary) p-3 text-center">
          <p className="text-2xl font-bold text-(--text-primary)">{avgRate}/min</p>
          <p className="text-xs text-(--text-secondary)">Average rate</p>
        </div>
      </div>

      {topFillers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-(--text-secondary) mb-2">
            Most used fillers
          </p>
          <div className="flex flex-wrap gap-2">
            {topFillers.map(([word, count]) => (
              <span key={word}
                    className="rounded-full border border-(--card-border)
                               bg-(--bg-secondary) px-3 py-1 text-xs font-mono
                               text-(--text-primary)">
                &quot;{word}&quot; × {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-(--text-secondary) leading-relaxed border-t
                    border-(--card-border) pt-3">
        💡 Industry benchmark: &lt;3 filler words per minute.
        Practice pausing instead of filling silence.
      </p>
    </div>
  )
}
