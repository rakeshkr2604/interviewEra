import type { CSSProperties } from 'react'
import {
  TCS_HERO_ROADMAP_STEPS,
  TCS_HERO_TOPIC_ICONS,
  TCS_HERO_TRACKS,
  TCS_HERO_VISUAL_TITLE,
} from '@/lib/seo/programmatic/tcs-hub'

type RoadmapIcon = (typeof TCS_HERO_ROADMAP_STEPS)[number]['icon']

function RoadmapIconGlyph({ kind }: { kind: RoadmapIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (kind) {
    case 'nqt':
      return (
        <svg {...common}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4M7 8h4M7 12h10" />
        </svg>
      )
    case 'aptitude':
      return (
        <svg {...common}>
          <path d="M4 19h16M6 16l3-6 3 4 3-7 3 9" />
        </svg>
      )
    case 'coding':
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )
    case 'technical':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      )
    case 'hr':
      return (
        <svg {...common}>
          <path d="M12 3a5 5 0 0 1 5 5v2H7V8a5 5 0 0 1 5-5z" />
          <path d="M7 10h10v2a5 5 0 0 1-10 0v-2z" />
          <path d="M9 18h6M10 21h4" />
        </svg>
      )
  }
}

export function TcsHeroVisual() {
  return (
    <figure className="ie-tcs-hero-visual" aria-labelledby="tcs-hero-visual-title">
      <div className="ie-tcs-hero-visual__inner">
        <p id="tcs-hero-visual-title" className="ie-tcs-hero-visual__title">
          {TCS_HERO_VISUAL_TITLE}
        </p>

        <ol className="ie-tcs-hero-visual__roadmap" aria-label="TCS campus hiring stages">
          {TCS_HERO_ROADMAP_STEPS.map((step, index) => (
            <li key={step.label} className="ie-tcs-hero-visual__step">
              <span className="ie-tcs-hero-visual__step-icon">
                <RoadmapIconGlyph kind={step.icon} />
              </span>
              <span className="ie-tcs-hero-visual__step-label">{step.label}</span>
              {index < TCS_HERO_ROADMAP_STEPS.length - 1 ? (
                <span className="ie-tcs-hero-visual__arrow" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="ie-tcs-hero-visual__tracks" aria-label="TCS fresher package tracks">
          {TCS_HERO_TRACKS.map((track) => (
            <span
              key={track.name}
              className="ie-tcs-hero-visual__track"
              style={{ '--track-accent': track.accent } as CSSProperties}
            >
              <span className="ie-tcs-hero-visual__track-mark" aria-hidden>
                {track.mark}
              </span>
              <span className="ie-tcs-hero-visual__track-name">{track.name}</span>
            </span>
          ))}
        </div>

        <div className="ie-tcs-hero-visual__topics" aria-label="Preparation focus areas">
          {TCS_HERO_TOPIC_ICONS.map((topic) => (
            <span key={topic} className="ie-tcs-hero-visual__topic">
              {topic}
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}
