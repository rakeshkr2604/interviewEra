/**
 * Ascending-path-over-mountains illustration — token-colored, works in both
 * themes. Shared between Readiness ("Keep going!") and Roadmap ("Target
 * role") hero cards so the motif stays one visual, not two near-duplicates.
 */
export function JourneyIllustration() {
  return (
    <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden>
      {/* Mountain silhouettes — back-to-front, same hue stepped by opacity */}
      <path
        d="M0,110 L30,55 L55,80 L85,30 L110,62 L140,20 L160,45 L160,110 Z"
        fill="var(--accent-primary)"
        opacity="0.1"
      />
      <path
        d="M0,110 L22,78 L48,95 L78,50 L104,80 L132,42 L160,70 L160,110 Z"
        fill="var(--accent-primary)"
        opacity="0.16"
      />

      <polyline
        points="12,95 45,70 80,78 115,35 148,15"
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth="2.5"
        strokeDasharray="1 8"
        strokeLinecap="round"
      />
      {[
        [12, 95],
        [45, 70],
        [80, 78],
        [115, 35],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="var(--card-bg)" stroke="var(--accent-primary)" strokeWidth="2" />
      ))}
      <g transform="translate(148, 15)">
        <line x1="0" y1="0" x2="0" y2="-22" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M0,-22 L16,-17 L0,-12 Z" fill="var(--accent-primary)" />
        <circle cx="0" cy="0" r="4" fill="var(--accent-primary)" />
      </g>
    </svg>
  )
}
