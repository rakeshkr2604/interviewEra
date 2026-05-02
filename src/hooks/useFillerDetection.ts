import { FILLER_WORDS, FILLER_THRESHOLDS, FILLER_MESSAGES } from '@/lib/filler-words/config'

export interface FillerAnalysis {
  count: number
  words: { word: string; occurrences: number }[]
  ratePerMinute: number
  severity: 'safe' | 'warning' | 'severe'
  message: string
  percentage: number
}

export function analyzeFillerWords(
  transcript: string,
  durationSeconds: number
): FillerAnalysis {
  const lower = transcript.toLowerCase()
  const totalWords = lower.split(/\s+/).filter(Boolean).length
  const detectedFillers: { word: string; occurrences: number }[] = []
  let totalCount = 0

  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi')
    const matches = lower.match(regex)
    if (matches && matches.length > 0) {
      detectedFillers.push({ word: filler, occurrences: matches.length })
      totalCount += matches.length
    }
  }

  const durationMinutes = Math.max(durationSeconds / 60, 0.1)
  const ratePerMinute = Math.round(totalCount / durationMinutes)

  let severity: 'safe' | 'warning' | 'severe' = 'safe'
  if (ratePerMinute >= FILLER_THRESHOLDS.severe) severity = 'severe'
  else if (ratePerMinute >= FILLER_THRESHOLDS.warning) severity = 'warning'

  return {
    count: totalCount,
    words: detectedFillers.sort((a, b) => b.occurrences - a.occurrences),
    ratePerMinute,
    severity,
    message: FILLER_MESSAGES[severity],
    percentage: totalWords > 0 ? Math.round((totalCount / totalWords) * 100) : 0,
  }
}
