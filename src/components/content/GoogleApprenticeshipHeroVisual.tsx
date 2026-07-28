import {
  GOOGLE_APPRENTICESHIP_DEADLINE,
  GOOGLE_APPRENTICESHIP_HERO_ALT,
  GOOGLE_APPRENTICESHIP_QUICK_FACTS,
} from '@/lib/seo/content/google-apprenticeship-hub'

function TrackIcon({ kind }: { kind: 'code' | 'data' | 'marketing' | 'pm' }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (kind) {
    case 'code':
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )
    case 'data':
      return (
        <svg {...common}>
          <path d="M4 19h16M6 16l3-6 3 4 3-7 3 9" />
        </svg>
      )
    case 'marketing':
      return (
        <svg {...common}>
          <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />
        </svg>
      )
    case 'pm':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      )
  }
}

/** Original infographic card — no third-party logos or trademarked marks. */
export function GoogleApprenticeshipHeroVisual() {
  return (
    <figure className="ie-ga-hero-visual" aria-labelledby="ga-hero-visual-title">
      <div className="ie-ga-hero-visual__inner">
        <p id="ga-hero-visual-title" className="ie-ga-hero-visual__title">
          Apprenticeship 2026 — Quick Facts (India)
        </p>
        <p className="ie-ga-hero-visual__status">
          <span className="ie-ga-hero-visual__pulse" aria-hidden />
          Applications open · Deadline {GOOGLE_APPRENTICESHIP_DEADLINE}
        </p>
        <dl className="ie-ga-hero-visual__grid">
          {GOOGLE_APPRENTICESHIP_QUICK_FACTS.map(([label, value]) => (
            <div key={label} className="ie-ga-hero-visual__row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="ie-ga-hero-visual__icons" aria-label="Four apprenticeship tracks">
          <span className="ie-ga-hero-visual__icon">
            <TrackIcon kind="code" />
            <span>Software</span>
          </span>
          <span className="ie-ga-hero-visual__icon">
            <TrackIcon kind="data" />
            <span>Data</span>
          </span>
          <span className="ie-ga-hero-visual__icon">
            <TrackIcon kind="marketing" />
            <span>Marketing</span>
          </span>
          <span className="ie-ga-hero-visual__icon">
            <TrackIcon kind="pm" />
            <span>PM</span>
          </span>
        </div>
      </div>
      <figcaption className="ie-ga-hero-visual__caption">{GOOGLE_APPRENTICESHIP_HERO_ALT}</figcaption>
    </figure>
  )
}
