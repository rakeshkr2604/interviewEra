/**
 * Status-tier color by value band — shared across analytics charts so a
 * score always means the same color everywhere. Fixed meaning per band,
 * never a cycled/rank-based hue (see dataviz guidance: color follows the
 * entity's state, never its position in a list).
 */

/** Tier color for a 0–100 percent value (skill breakdown bars, dialogs). */
export function tierColorFromPercent(pct: number): string {
  if (pct >= 75) return 'var(--accent-success)'
  if (pct >= 50) return 'var(--accent-primary)'
  return 'var(--accent-warning)'
}

/** Tier color for a 0–10 score value (score trend bars, per-answer cards). */
export function tierColorFromScore(score: number): string {
  return tierColorFromPercent(score * 10)
}
