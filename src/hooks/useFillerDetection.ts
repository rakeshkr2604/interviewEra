'use client'
// Re-export the pure analysis function from its canonical lib location so
// existing client imports (session page, report page) keep working unchanged.
export type { FillerAnalysis } from '@/lib/filler-words/analyze'
export { analyzeFillerWords } from '@/lib/filler-words/analyze'
