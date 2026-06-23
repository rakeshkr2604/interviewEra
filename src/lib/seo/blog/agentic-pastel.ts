/** Pastel column / card variants — lavender, mint, peach, sky, rose (cycles). */
export const AGENTIC_PASTEL_VARIANTS = ['lavender', 'mint', 'peach', 'sky', 'rose'] as const

export type AgenticPastelVariant = (typeof AGENTIC_PASTEL_VARIANTS)[number]

export function agenticPastelVariant(index: number): AgenticPastelVariant {
  return AGENTIC_PASTEL_VARIANTS[index % AGENTIC_PASTEL_VARIANTS.length]!
}

export function agenticPastelCardClass(index: number): string {
  return `ie-agentic-pastel-card ie-agentic-pastel-card--${agenticPastelVariant(index)}`
}
